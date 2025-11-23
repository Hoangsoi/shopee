import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const adjustBalanceSchema = z.object({
  user_id: z.number().int().positive('ID người dùng không hợp lệ'),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  type: z.enum(['add', 'subtract'], {
    errorMap: () => ({ message: 'Type phải là add hoặc subtract' }),
  }),
  description: z.string().optional(),
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

// POST: Cộng hoặc trừ tiền cho user (chỉ admin)
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = adjustBalanceSchema.parse(body);

    const { user_id, amount, type, description } = validatedData;

    // Kiểm tra user có tồn tại không
    const users = await sql`
      SELECT id, wallet_balance FROM users WHERE id = ${user_id}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    const user = users[0];
    const currentBalance = parseFloat(user.wallet_balance?.toString() || '0');

    // Kiểm tra số dư nếu trừ tiền
    if (type === 'subtract' && currentBalance < amount) {
      return NextResponse.json(
        { error: 'Số dư không đủ để trừ' },
        { status: 400 }
      );
    }

    // Tính số dư mới
    const newBalance = type === 'add' 
      ? currentBalance + amount 
      : currentBalance - amount;

    // Cập nhật số dư ví
    await sql`
      UPDATE users
      SET 
        wallet_balance = ${newBalance},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user_id}
    `;

    // Nếu là cộng tiền (nạp tiền), tạo transaction và ghi lịch sử
    if (type === 'add') {
      // Tạo transaction với status='completed' để ghi lịch sử
      await sql`
        INSERT INTO transactions (
          user_id,
          type,
          amount,
          status,
          description,
          created_at,
          updated_at
        ) VALUES (
          ${user_id},
          'deposit',
          ${amount},
          'completed',
          ${description || null},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
    }
    // Nếu là trừ tiền, KHÔNG tạo transaction và KHÔNG ghi lịch sử

    // Lấy thông tin user sau khi cập nhật
    const result = await sql`
      SELECT id, email, name, wallet_balance
      FROM users
      WHERE id = ${user_id}
    `;

    // Nếu là cộng tiền, cập nhật VIP status
    if (type === 'add') {
      const { updateVipStatus } = await import('@/lib/vip-utils');
      await updateVipStatus(user_id);
    }

    return NextResponse.json({
      message: type === 'add'
        ? `Đã nạp ${new Intl.NumberFormat('vi-VN').format(amount)}đ cho người dùng`
        : `Đã trừ ${new Intl.NumberFormat('vi-VN').format(amount)}đ từ tài khoản người dùng`,
      user: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        wallet_balance: result[0].wallet_balance ? parseFloat(result[0].wallet_balance.toString()) : 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Adjust balance error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cộng/trừ tiền' },
      { status: 500 }
    );
  }
}

