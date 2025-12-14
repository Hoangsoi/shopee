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
    let orderItemsCount = 0;
    try {
      // Đếm order_items của user (thông qua orders)
      const orderItemsCountBefore = await sql`
        SELECT COUNT(*)::int as count 
        FROM order_items 
        WHERE order_id IN (SELECT id FROM orders WHERE user_id = ${userId})
      `;
      orderItemsCount = orderItemsCountBefore[0]?.count || 0;
    } catch (error) {
      // Bảng có thể không tồn tại
      if (process.env.NODE_ENV === 'development') {
        console.error('Error counting order_items:', error);
      }
    }

    const ordersCountBefore = await sql`
      SELECT COUNT(*)::int as count FROM orders WHERE user_id = ${userId}
    `;
    const transactionsCountBefore = await sql`
      SELECT COUNT(*)::int as count FROM transactions WHERE user_id = ${userId}
    `;
    const investmentsCountBefore = await sql`
      SELECT COUNT(*)::int as count FROM investments WHERE user_id = ${userId}
    `;
    
    // Đếm số vé thưởng của user trước khi xóa
    let ticketsCount = 0;
    try {
      const ticketsCountBefore = await sql`
        SELECT COUNT(*)::int as count FROM tickets WHERE user_id = ${userId}
      `;
      ticketsCount = ticketsCountBefore[0]?.count || 0;
    } catch (error) {
      // Bảng có thể không tồn tại
      if (process.env.NODE_ENV === 'development') {
        console.error('Error counting tickets:', error);
      }
    }

    const ordersCount = ordersCountBefore[0]?.count || 0;
    const transactionsCount = transactionsCountBefore[0]?.count || 0;
    const investmentsCount = investmentsCountBefore[0]?.count || 0;

    // Xóa tất cả order_items của user (thông qua orders)
    // Vì order_items có foreign key với orders, nên khi xóa orders sẽ tự động xóa order_items
    // Nhưng để đảm bảo, xóa trực tiếp trước
    try {
      await sql`
        DELETE FROM order_items 
        WHERE order_id IN (SELECT id FROM orders WHERE user_id = ${userId})
      `;
    } catch (error) {
      // Bảng có thể không tồn tại hoặc đã được xóa bởi CASCADE
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting order_items:', error);
      }
    }

    // Xóa tất cả orders của user
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

    // Xóa tất cả vé thưởng của user
    try {
      await sql`DELETE FROM tickets WHERE user_id = ${userId}`;
    } catch (error) {
      // Bảng có thể không tồn tại
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting user tickets:', error);
      }
    }

    // Reset số dư, hoa hồng và VIP level về 0 như lúc mới đăng ký
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
          WHERE id = ${userId}
        `;
        vipLevelReset = true;
      } else {
        // Nếu cột vip_level chưa tồn tại, chỉ reset wallet_balance và commission
        await sql`
          UPDATE users 
          SET wallet_balance = 0, commission = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${userId}
        `;
      }
    } catch (error) {
      // Fallback: chỉ reset wallet_balance và commission
      await sql`
        UPDATE users 
        SET wallet_balance = 0, commission = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${userId}
      `;
      if (process.env.NODE_ENV === 'development') {
        console.error('Error resetting VIP level:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa tất cả dữ liệu của người dùng thành công: ${orderItemsCount} chi tiết đơn hàng, ${ordersCount} đơn hàng, ${transactionsCount} giao dịch, ${investmentsCount} đầu tư, ${ticketsCount} vé thưởng. Đã reset số dư, hoa hồng${vipLevelReset ? ' và cấp độ VIP' : ''} về 0.`,
      deleted: {
        order_items: orderItemsCount,
        orders: ordersCount,
        transactions: transactionsCount,
        investments: investmentsCount,
        tickets: ticketsCount,
        vip_level_reset: vipLevelReset,
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

