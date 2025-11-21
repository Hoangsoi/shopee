import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET: Lấy thông tin ngân hàng của một user cụ thể (chỉ admin)
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const userId = parseInt(params.userId);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'User ID không hợp lệ' },
        { status: 400 }
      );
    }

    // Lấy thông tin ngân hàng của user
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
        WHERE ba.user_id = ${userId}
      `;

      if (bankAccounts.length === 0) {
        return NextResponse.json({
          bank_account: null,
        });
      }

      const account = bankAccounts[0];

      return NextResponse.json({
        bank_account: {
          id: account.id,
          user_id: account.user_id,
          user_name: account.user_name,
          user_email: account.user_email,
          bank_name: account.bank_name,
          account_number: account.account_number, // Admin thấy số đầy đủ
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

