import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { ensureCtvProposalTables } from '@/lib/ctv-proposals-db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    await ensureCtvProposalTables();

    const proposals = await sql`
      SELECT id, reference_code, status, total_amount, estimated_commission, created_at
      FROM ctv_proposals
      WHERE user_id = ${decoded.userId} AND status = 'pending'
      ORDER BY created_at DESC
    `;

    const ids = proposals.map((p: Record<string, unknown>) => p.id as number);
    let itemsByProposal: Record<number, unknown[]> = {};
    if (ids.length > 0) {
      for (const pid of ids) {
        const rows = await sql`
          SELECT
            cpi.product_id,
            cpi.product_name,
            cpi.product_price,
            cpi.quantity,
            cpi.subtotal,
            p.image_url
          FROM ctv_proposal_items cpi
          LEFT JOIN products p ON p.id = cpi.product_id
          WHERE cpi.proposal_id = ${pid}
          ORDER BY cpi.id ASC
        `;
        itemsByProposal[pid] = rows.map((r: any) => ({
          product_id: r.product_id,
          product_name: r.product_name,
          product_price: parseFloat(String(r.product_price)),
          quantity: r.quantity,
          subtotal: parseFloat(String(r.subtotal)),
          image_url: r.image_url ? String(r.image_url) : null,
        }));
      }
    }

    return NextResponse.json({
      proposals: proposals.map((p: any) => ({
        id: p.id,
        reference_code: p.reference_code,
        status: p.status,
        total_amount: parseFloat(String(p.total_amount)),
        estimated_commission: parseFloat(String(p.estimated_commission)),
        created_at: p.created_at,
        items: itemsByProposal[p.id] || [],
      })),
    });
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('ctv_proposals')) {
      await ensureCtvProposalTables().catch(() => {});
      return NextResponse.json({ proposals: [] });
    }
    logger.error('CTV proposals GET', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}
