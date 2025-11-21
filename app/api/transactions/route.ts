import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const createTransactionSchema = z.object({
  type: z.enum(['deposit', 'withdraw']),
  amount: z.number().positive(),
  description: z.string().optional(),
});

// GET: Lấy lịch sử giao dịch (nạp/rút) của user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Kiểm tra xem bảng transactions có tồn tại không
    try {
      const transactions = await sql`
        SELECT 
          t.id,
          t.type,
          t.amount,
          t.status,
          t.description,
          t.created_at,
          t.updated_at,
          ba.bank_name,
          ba.account_number
        FROM transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.user_id = ${decoded.userId}
        ORDER BY t.created_at DESC
      `;

      return NextResponse.json({
        transactions: transactions.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount.toString()),
          status: t.status,
          description: t.description,
          bank_name: t.bank_name,
          account_number: t.account_number ? maskAccountNumber(t.account_number) : null,
          created_at: t.created_at,
          updated_at: t.updated_at,
        })),
      });
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, trả về mảng rỗng
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          transactions: [],
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy lịch sử giao dịch' },
      { status: 500 }
    );
  }
}

// POST: Tạo giao dịch nạp/rút mới
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    // Kiểm tra và tạo bảng transactions nếu chưa có
    try {
      await sql`SELECT 1 FROM transactions LIMIT 1`;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        await sql`
          CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL,
            amount DECIMAL(15, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            description TEXT,
            bank_account_id INTEGER REFERENCES bank_accounts(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`;
      }
    }

    // Lấy thông tin bank_account nếu là rút tiền
    let bankAccountId = null;
    if (validatedData.type === 'withdraw') {
      const bankAccounts = await sql`
        SELECT id FROM bank_accounts WHERE user_id = ${decoded.userId}
      `;
      if (bankAccounts.length === 0) {
        return NextResponse.json(
          { error: 'Chưa có thông tin ngân hàng. Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền.' },
          { status: 400 }
        );
      }
      bankAccountId = bankAccounts[0].id;
    }

    // Kiểm tra số dư ví và trạng thái đóng băng nếu là rút tiền
    if (validatedData.type === 'withdraw') {
      const users = await sql`
        SELECT wallet_balance, COALESCE(is_frozen, false) as is_frozen FROM users WHERE id = ${decoded.userId}
      `;
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User không tồn tại' },
          { status: 404 }
        );
      }
      const walletBalance = users[0].wallet_balance ? parseFloat(users[0].wallet_balance.toString()) : 0;
      const isFrozen = users[0].is_frozen || false;

      // Kiểm tra tài khoản có bị đóng băng không
      if (isFrozen) {
        return NextResponse.json(
          { error: 'Tài khoản của bạn đã bị đóng băng. Không thể thực hiện rút tiền. Vui lòng liên hệ admin để được hỗ trợ.' },
          { status: 403 }
        );
      }

      if (walletBalance < validatedData.amount) {
        return NextResponse.json(
          { error: 'Số dư ví không đủ' },
          { status: 400 }
        );
      }
    }

    // Tạo giao dịch
    const result = await sql`
      INSERT INTO transactions (user_id, type, amount, status, description, bank_account_id)
      VALUES (${decoded.userId}, ${validatedData.type}, ${validatedData.amount}, 'pending', ${validatedData.description || null}, ${bankAccountId})
      RETURNING id, type, amount, status, description, created_at
    `;

    // Nếu là nạp tiền, cập nhật số dư ví ngay (tự động approve)
    if (validatedData.type === 'deposit') {
      await sql`
        UPDATE users 
        SET wallet_balance = wallet_balance + ${validatedData.amount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${decoded.userId}
      `;
      await sql`
        UPDATE transactions 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${result[0].id}
      `;
    } else if (validatedData.type === 'withdraw') {
      // Nếu là rút tiền, trừ số dư và chờ admin duyệt
      await sql`
        UPDATE users 
        SET wallet_balance = wallet_balance - ${validatedData.amount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${decoded.userId}
      `;
      // Status vẫn là 'pending' để admin duyệt
    }

    return NextResponse.json({
      message: validatedData.type === 'deposit' ? 'Nạp tiền thành công' : 'Yêu cầu rút tiền đã được gửi. Vui lòng chờ admin duyệt.',
      transaction: {
        id: result[0].id,
        type: result[0].type,
        amount: parseFloat(result[0].amount.toString()),
        status: validatedData.type === 'deposit' ? 'completed' : 'pending',
        description: result[0].description,
        created_at: result[0].created_at,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo giao dịch' },
      { status: 500 }
    );
  }
}

// Hàm ẩn số tài khoản: chỉ hiển thị 2 số cuối
function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 2) {
    return accountNumber;
  }
  const lastTwo = accountNumber.slice(-2);
  const masked = '*'.repeat(accountNumber.length - 2);
  return `${masked}${lastTwo}`;
}

