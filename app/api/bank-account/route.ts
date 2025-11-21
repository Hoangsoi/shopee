import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const bankAccountSchema = z.object({
  bank_name: z.string().min(1, 'Tên ngân hàng không được để trống'),
  account_number: z.string().min(1, 'Số tài khoản không được để trống'),
  account_holder_name: z.string().min(1, 'Tên chủ tài khoản không được để trống'),
  branch: z.string().optional(),
});

// GET: Lấy thông tin ngân hàng của user hiện tại
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

    // Kiểm tra xem bảng bank_accounts có tồn tại không
    try {
      const bankAccounts = await sql`
        SELECT 
          id,
          bank_name,
          account_number,
          account_holder_name,
          branch,
          created_at,
          updated_at
        FROM bank_accounts
        WHERE user_id = ${decoded.userId}
      `;

      if (bankAccounts.length === 0) {
        return NextResponse.json({
          bank_account: null,
        });
      }

      const account = bankAccounts[0];
      
      // Ẩn số tài khoản: chỉ hiển thị 2 số cuối
      const maskedAccountNumber = maskAccountNumber(account.account_number);

      return NextResponse.json({
        bank_account: {
          id: account.id,
          bank_name: account.bank_name,
          account_number: maskedAccountNumber,
          account_holder_name: account.account_holder_name,
          branch: account.branch,
          created_at: account.created_at,
          updated_at: account.updated_at,
        },
      });
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, trả về null
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          bank_account: null,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Get bank account error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin ngân hàng' },
      { status: 500 }
    );
  }
}

// POST: Tạo thông tin ngân hàng (chỉ lần đầu)
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
    const validatedData = bankAccountSchema.parse(body);

    // Kiểm tra xem user đã có thông tin ngân hàng chưa
    try {
      const existing = await sql`
        SELECT id FROM bank_accounts WHERE user_id = ${decoded.userId}
      `;

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Bạn đã có thông tin ngân hàng. Chỉ admin mới có thể thay đổi.' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, tạo bảng trước
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        await sql`
          CREATE TABLE IF NOT EXISTS bank_accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            bank_name VARCHAR(255) NOT NULL,
            account_number VARCHAR(50) NOT NULL,
            account_holder_name VARCHAR(255) NOT NULL,
            branch VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id)`;
      } else {
        throw error;
      }
    }

    // Tạo thông tin ngân hàng mới
    const result = await sql`
      INSERT INTO bank_accounts (user_id, bank_name, account_number, account_holder_name, branch)
      VALUES (${decoded.userId}, ${validatedData.bank_name}, ${validatedData.account_number}, ${validatedData.account_holder_name}, ${validatedData.branch || null})
      RETURNING id, bank_name, account_number, account_holder_name, branch, created_at
    `;

    return NextResponse.json({
      message: 'Đã lưu thông tin ngân hàng thành công',
      bank_account: {
        id: result[0].id,
        bank_name: result[0].bank_name,
        account_number: maskAccountNumber(result[0].account_number),
        account_holder_name: result[0].account_holder_name,
        branch: result[0].branch,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create bank account error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lưu thông tin ngân hàng' },
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

