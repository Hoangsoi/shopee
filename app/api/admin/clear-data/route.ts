import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// DELETE: Xóa tất cả giao dịch và đơn hàng (chỉ admin)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập. Chỉ admin mới được thực hiện thao tác này.' },
        { status: 403 }
      );
    }

    // Xóa tất cả order_items trước (do foreign key constraint)
    try {
      await sql`DELETE FROM order_items`;
    } catch (error) {
      // Bảng có thể không tồn tại hoặc đã được xóa bởi CASCADE
    }
    
    // Xóa tất cả orders
    await sql`DELETE FROM orders`;
    
    // Xóa tất cả transactions
    await sql`DELETE FROM transactions`;

    // Đếm số bản ghi đã xóa
    const transactionsCount = await sql`SELECT COUNT(*)::int as count FROM transactions`;
    const ordersCount = await sql`SELECT COUNT(*)::int as count FROM orders`;

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tất cả giao dịch và đơn hàng thành công',
      deleted: {
        transactions: transactionsCount[0]?.count || 0,
        orders: ordersCount[0]?.count || 0,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error clearing data:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi xóa dữ liệu. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}

