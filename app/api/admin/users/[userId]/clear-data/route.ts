import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// DELETE: Xóa tất cả giao dịch và đơn hàng của một user cụ thể (chỉ admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập. Chỉ admin mới được thực hiện thao tác này.' },
        { status: 403 }
      );
    }

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'ID người dùng không hợp lệ' },
        { status: 400 }
      );
    }

    // Kiểm tra user có tồn tại không
    const userCheck = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (userCheck.length === 0) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    // Đếm số bản ghi trước khi xóa
    const ordersCountBefore = await sql`
      SELECT COUNT(*)::int as count FROM orders WHERE user_id = ${userId}
    `;
    const transactionsCountBefore = await sql`
      SELECT COUNT(*)::int as count FROM transactions WHERE user_id = ${userId}
    `;
    const investmentsCountBefore = await sql`
      SELECT COUNT(*)::int as count FROM investments WHERE user_id = ${userId}
    `;

    const ordersCount = ordersCountBefore[0]?.count || 0;
    const transactionsCount = transactionsCountBefore[0]?.count || 0;
    const investmentsCount = investmentsCountBefore[0]?.count || 0;

    // Xóa tất cả order_items của user (thông qua orders)
    // Vì order_items có foreign key với orders, nên khi xóa orders sẽ tự động xóa order_items
    await sql`DELETE FROM orders WHERE user_id = ${userId}`;
    
    // Xóa tất cả transactions của user
    await sql`DELETE FROM transactions WHERE user_id = ${userId}`;

    // Xóa tất cả investments của user
    try {
      await sql`DELETE FROM investments WHERE user_id = ${userId}`;
    } catch (error) {
      // Bảng có thể không tồn tại
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting user investments:', error);
      }
    }

    // Reset số dư và hoa hồng về 0 như lúc mới đăng ký
    await sql`
      UPDATE users 
      SET wallet_balance = 0, commission = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: `Đã xóa ${ordersCount} đơn hàng, ${transactionsCount} giao dịch và ${investmentsCount} đầu tư của người dùng thành công. Số dư và hoa hồng đã được reset về 0.`,
      deleted: {
        orders: ordersCount,
        transactions: transactionsCount,
        investments: investmentsCount,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error clearing user data:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi xóa dữ liệu. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}

