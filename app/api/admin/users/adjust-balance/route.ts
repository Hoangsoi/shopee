import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const adjustBalanceSchema = z.object({
  user_id: z.number().int().positive('ID người dùng không hợp lệ'),
  amount: z.number()
    .positive('Số tiền phải lớn hơn 0')
    .max(1000000000, 'Số tiền không được vượt quá 1 tỷ VNĐ')
    .refine((val) => val >= 1000, 'Số tiền tối thiểu là 1,000 VNĐ'),
  type: z.enum(['add', 'subtract'], {
    errorMap: () => ({ message: 'Type phải là add hoặc subtract' }),
  }),
  description: z.string().max(500, 'Mô tả không được vượt quá 500 ký tự').optional(),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

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

    // Validate số dư không được âm
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Số dư sau khi điều chỉnh không được âm' },
        { status: 400 }
      );
    }

    // Cập nhật số dư ví với điều kiện đảm bảo không âm
    const updateResult = await sql`
      UPDATE users
      SET 
        wallet_balance = ${newBalance},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user_id} AND (wallet_balance >= 0 OR ${type} = 'add')
      RETURNING id, wallet_balance
    `;

    // Kiểm tra xem có cập nhật thành công không
    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: 'Không thể cập nhật số dư. Vui lòng thử lại.' },
        { status: 400 }
      );
    }

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
    logger.error('Adjust balance error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

