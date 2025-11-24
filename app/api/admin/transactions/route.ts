import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  transaction_id: z.number().int().positive('ID giao dịch không hợp lệ'),
  status: z.enum(['completed', 'failed', 'cancelled'], {
    errorMap: () => ({ message: 'Status phải là completed, failed hoặc cancelled' }),
  }),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy tất cả transactions (chỉ admin) với pagination
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Tham số pagination không hợp lệ. Page >= 1, Limit 1-100' },
        { status: 400 }
      );
    }

    // Get total count
    let totalCount = 0;
    let countQuery;
    if (status && type) {
      countQuery = sql`SELECT COUNT(*)::int as count FROM transactions WHERE status = ${status} AND type = ${type}`;
    } else if (status) {
      countQuery = sql`SELECT COUNT(*)::int as count FROM transactions WHERE status = ${status}`;
    } else if (type) {
      countQuery = sql`SELECT COUNT(*)::int as count FROM transactions WHERE type = ${type}`;
    } else {
      countQuery = sql`SELECT COUNT(*)::int as count FROM transactions`;
    }
    const countResult = await countQuery;
    totalCount = countResult[0]?.count || 0;

    let query;
    if (status && type) {
      query = sql`
        SELECT 
          t.id,
          t.user_id,
          t.type,
          t.amount,
          t.status,
          t.description,
          t.created_at,
          t.updated_at,
          u.name as user_name,
          u.email as user_email,
          ba.bank_name,
          ba.account_number,
          ba.account_holder_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.status = ${status} AND t.type = ${type}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status) {
      query = sql`
        SELECT 
          t.id,
          t.user_id,
          t.type,
          t.amount,
          t.status,
          t.description,
          t.created_at,
          t.updated_at,
          u.name as user_name,
          u.email as user_email,
          ba.bank_name,
          ba.account_number,
          ba.account_holder_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.status = ${status}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (type) {
      query = sql`
        SELECT 
          t.id,
          t.user_id,
          t.type,
          t.amount,
          t.status,
          t.description,
          t.created_at,
          t.updated_at,
          u.name as user_name,
          u.email as user_email,
          ba.bank_name,
          ba.account_number,
          ba.account_holder_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.type = ${type}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT 
          t.id,
          t.user_id,
          t.type,
          t.amount,
          t.status,
          t.description,
          t.created_at,
          t.updated_at,
          u.name as user_name,
          u.email as user_email,
          ba.bank_name,
          ba.account_number,
          ba.account_holder_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const transactions = await query;

    return NextResponse.json({
      transactions: transactions.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        user_name: t.user_name,
        user_email: t.user_email,
        type: t.type,
        amount: parseFloat(t.amount.toString()),
        status: t.status,
        description: t.description,
        bank_name: t.bank_name,
        account_number: t.account_number,
        account_holder_name: t.account_holder_name,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách giao dịch' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật trạng thái transaction (duyệt rút tiền)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTransactionSchema.parse(body);

    const { transaction_id, status } = validatedData;

    // Lấy thông tin transaction
    const transactions = await sql`
      SELECT 
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.status
      FROM transactions t
      WHERE t.id = ${transaction_id}
    `;

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Giao dịch không tồn tại' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];

    // Chỉ có thể cập nhật transaction đang ở trạng thái pending
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: `Giao dịch đã được xử lý. Trạng thái hiện tại: ${transaction.status}` },
        { status: 400 }
      );
    }

    const amount = parseFloat(transaction.amount.toString());

    // Cập nhật trạng thái transaction
    await sql`
      UPDATE transactions
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${transaction_id}
    `;

    // Xử lý hoàn tiền nếu từ chối hoặc hủy rút tiền
    if (transaction.type === 'withdraw' && (status === 'failed' || status === 'cancelled')) {
      // Hoàn lại tiền vào ví
      await sql`
        UPDATE users
        SET wallet_balance = wallet_balance + ${amount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${transaction.user_id}
      `;
    }

    // Nếu là duyệt transaction nạp tiền, cập nhật VIP status
    if (transaction.type === 'deposit' && status === 'completed') {
      const { updateVipStatus } = await import('@/lib/vip-utils');
      await updateVipStatus(transaction.user_id);
    }

    return NextResponse.json({
      message: status === 'completed' 
        ? 'Duyệt giao dịch thành công'
        : 'Từ chối giao dịch thành công. Tiền đã được hoàn lại vào ví.',
      transaction: {
        id: transaction.id,
        status: status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update transaction status error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật trạng thái giao dịch' },
      { status: 500 }
    );
  }
}

