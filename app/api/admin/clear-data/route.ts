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

    // Đếm số bản ghi trước khi xóa
    let orderItemsCount = 0;
    try {
      const orderItemsCountBefore = await sql`SELECT COUNT(*)::int as count FROM order_items`;
      orderItemsCount = orderItemsCountBefore[0]?.count || 0;
    } catch (error) {
      // Bảng có thể không tồn tại
    }

    const ordersCountBefore = await sql`SELECT COUNT(*)::int as count FROM orders`;
    const transactionsCountBefore = await sql`SELECT COUNT(*)::int as count FROM transactions`;
    const investmentsCountBefore = await sql`SELECT COUNT(*)::int as count FROM investments`;
    const usersCountBefore = await sql`SELECT COUNT(*)::int as count FROM users WHERE role != 'admin'`;

    const ordersCount = ordersCountBefore[0]?.count || 0;
    const transactionsCount = transactionsCountBefore[0]?.count || 0;
    const investmentsCount = investmentsCountBefore[0]?.count || 0;
    const usersCount = usersCountBefore[0]?.count || 0;

    // Xóa tất cả order_items trước (do foreign key constraint)
    try {
      await sql`DELETE FROM order_items`;
    } catch (error) {
      // Bảng có thể không tồn tại hoặc đã được xóa bởi CASCADE
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting order_items:', error);
      }
    }
    
    // Xóa tất cả orders
    await sql`DELETE FROM orders`;
    
    // Xóa tất cả transactions
    await sql`DELETE FROM transactions`;

    // Xóa tất cả investments
    try {
      await sql`DELETE FROM investments`;
    } catch (error) {
      // Bảng có thể không tồn tại
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting investments:', error);
      }
    }

    // Reset số dư, hoa hồng và VIP level về 0 cho tất cả users (trừ admin)
    // Kiểm tra xem cột vip_level có tồn tại không
    let vipLevelReset = false;
    try {
      const checkVipLevel = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'vip_level'
      `;
      if (checkVipLevel.length > 0) {
        await sql`
          UPDATE users 
          SET wallet_balance = 0, commission = 0, vip_level = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE role != 'admin'
        `;
        vipLevelReset = true;
      } else {
        // Nếu cột vip_level chưa tồn tại, chỉ reset wallet_balance và commission
        await sql`
          UPDATE users 
          SET wallet_balance = 0, commission = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE role != 'admin'
        `;
      }
    } catch (error) {
      // Fallback: chỉ reset wallet_balance và commission
      await sql`
        UPDATE users 
        SET wallet_balance = 0, commission = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE role != 'admin'
      `;
      if (process.env.NODE_ENV === 'development') {
        console.error('Error resetting VIP level:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa tất cả dữ liệu thành công: ${orderItemsCount} chi tiết đơn hàng, ${ordersCount} đơn hàng, ${transactionsCount} giao dịch, ${investmentsCount} đầu tư. Đã reset số dư, hoa hồng${vipLevelReset ? ' và cấp độ VIP' : ''} về 0 cho ${usersCount} người dùng.`,
      deleted: {
        order_items: orderItemsCount,
        orders: ordersCount,
        transactions: transactionsCount,
        investments: investmentsCount,
        users_reset: usersCount,
        vip_level_reset: vipLevelReset,
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

