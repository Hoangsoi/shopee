import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { ensureCtvProposalTables } from '@/lib/ctv-proposals-db';
import { createPendingCashbackOrderFromItems } from '@/lib/pending-order-checkout';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const idParam = params.id;
    const proposalId = parseInt(idParam, 10);
    if (!Number.isFinite(proposalId) || proposalId < 1) {
      return NextResponse.json({ error: 'ID đề xuất không hợp lệ' }, { status: 400 });
    }

    await ensureCtvProposalTables();

    const locked = await sql`
      UPDATE ctv_proposals
      SET status = 'processing', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${proposalId} AND user_id = ${decoded.userId} AND status = 'pending'
      RETURNING id, reference_code, payment_method, shipping_address, notes
    `;

    if (locked.length === 0) {
      const check = await sql`
        SELECT status FROM ctv_proposals WHERE id = ${proposalId} AND user_id = ${decoded.userId}
      `;
      if (check.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy đề xuất' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Đề xuất đã được xử lý hoặc đang xử lý. Vui lòng tải lại trang.' },
        { status: 409 }
      );
    }

    const proposal = locked[0];
    const itemRows = await sql`
      SELECT product_id, quantity FROM ctv_proposal_items
      WHERE proposal_id = ${proposalId}
      ORDER BY id ASC
    `;

    const items = itemRows.map((r: Record<string, unknown>) => ({
      product_id: r.product_id as number,
      quantity: r.quantity as number,
    }));

    const noteRef = proposal.reference_code ? `Đề xuất CTV ${proposal.reference_code}` : `Đề xuất CTV #${proposalId}`;
    const orderNumber = `ORD-${Date.now()}-${decoded.userId}`;

    const result = await createPendingCashbackOrderFromItems(decoded.userId, items, {
      payment_method: proposal.payment_method || 'ctv',
      shipping_address: proposal.shipping_address || null,
      notes: proposal.notes ? `${noteRef} — ${proposal.notes}` : noteRef,
      clearCart: false,
      orderNumber,
    });

    if (!result.ok) {
      await sql`
        UPDATE ctv_proposals
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${proposalId}
      `;
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    await sql`
      UPDATE ctv_proposals
      SET status = 'accepted', order_id = ${result.order.id}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${proposalId}
    `;

    return NextResponse.json({
      message:
        'Đã xác nhận mua. Đơn hàng đã chuyển sang mục Đơn hàng và đang chờ admin phê duyệt.',
      order: result.order,
    });
  } catch (error) {
    logger.error('CTV accept', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}
