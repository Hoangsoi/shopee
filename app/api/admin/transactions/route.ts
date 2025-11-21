import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  transaction_id: z.number().int().positive('ID giao dịch không hợp lệ'),
  status: z.enum(['completed', 'failed', 'cancelled'], {
    errorMap: () => ({ message: 'Status phải là completed, failed hoặc cancelled' }),
  }),
});

// Helper to check admin role
async function isAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    console.log('No token found');
    return false;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('Token verification failed');
    return false;
  }
  // Nếu token không có role, query từ database
  if (!decoded.role) {
    try {
      const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
      if (users.length === 0 || users[0].role !== 'admin') {
        console.log('User is not admin');
        return false;
      }
    } catch (error) {
      console.error('Error checking role from database:', error);
      return false;
    }
  } else if (decoded.role !== 'admin') {
    console.log('User role is not admin:', decoded.role);
    return false;
  }
  return true;
}

// GET: Lấy tất cả transactions (chỉ admin)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

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
          ba.account_number
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.status = ${status} AND t.type = ${type}
        ORDER BY t.created_at DESC
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
          ba.account_number
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.status = ${status}
        ORDER BY t.created_at DESC
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
          ba.account_number
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.type = ${type}
        ORDER BY t.created_at DESC
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
          ba.account_number
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        ORDER BY t.created_at DESC
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
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
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

