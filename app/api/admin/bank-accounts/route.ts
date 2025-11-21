import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const updateBankAccountSchema = z.object({
  user_id: z.number().int().positive(),
  bank_name: z.string().min(1, 'Tên ngân hàng không được để trống'),
  account_number: z.string().min(1, 'Số tài khoản không được để trống'),
  account_holder_name: z.string().min(1, 'Tên chủ tài khoản không được để trống'),
  branch: z.string().optional(),
});

// GET: Lấy danh sách tất cả thông tin ngân hàng (chỉ admin)
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

    // Kiểm tra quyền admin
    const users = await sql`
      SELECT role FROM users WHERE id = ${decoded.userId}
    `;

    if (users.length === 0 || users[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Lấy danh sách tất cả thông tin ngân hàng
    try {
      const bankAccounts = await sql`
        SELECT 
          ba.id,
          ba.user_id,
          ba.bank_name,
          ba.account_number,
          ba.account_holder_name,
          ba.branch,
          ba.created_at,
          ba.updated_at,
          u.name as user_name,
          u.email as user_email
        FROM bank_accounts ba
        LEFT JOIN users u ON ba.user_id = u.id
        ORDER BY ba.created_at DESC
      `;

      return NextResponse.json({
        bank_accounts: bankAccounts.map((acc: any) => ({
          id: acc.id,
          user_id: acc.user_id,
          user_name: acc.user_name,
          user_email: acc.user_email,
          bank_name: acc.bank_name,
          account_number: acc.account_number, // Admin thấy số đầy đủ
          account_holder_name: acc.account_holder_name,
          branch: acc.branch,
          created_at: acc.created_at,
          updated_at: acc.updated_at,
        })),
      });
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, trả về mảng rỗng
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          bank_accounts: [],
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Get bank accounts error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách thông tin ngân hàng' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật thông tin ngân hàng (chỉ admin)
export async function PUT(request: NextRequest) {
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

    // Kiểm tra quyền admin
    const users = await sql`
      SELECT role FROM users WHERE id = ${decoded.userId}
    `;

    if (users.length === 0 || users[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateBankAccountSchema.parse(body);

    // Cập nhật hoặc tạo mới thông tin ngân hàng
    const result = await sql`
      INSERT INTO bank_accounts (user_id, bank_name, account_number, account_holder_name, branch)
      VALUES (${validatedData.user_id}, ${validatedData.bank_name}, ${validatedData.account_number}, ${validatedData.account_holder_name}, ${validatedData.branch || null})
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        account_holder_name = EXCLUDED.account_holder_name,
        branch = EXCLUDED.branch,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, bank_name, account_number, account_holder_name, branch, updated_at
    `;

    return NextResponse.json({
      message: 'Cập nhật thông tin ngân hàng thành công',
      bank_account: result[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update bank account error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật thông tin ngân hàng' },
      { status: 500 }
    );
  }
}

