import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy thống kê tổng quan
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Đếm tổng số users
    const usersCount = await sql`
      SELECT COUNT(*)::int as count FROM users
    `;
    const totalUsers = usersCount[0]?.count || 0;

    // Đếm khách đăng ký mới (trong 24 giờ qua)
    const newUsersCount = await sql`
      SELECT COUNT(*)::int as count 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '24 hours' AND role = 'user'
    `;
    const newUsers = newUsersCount[0]?.count || 0;

    // Đếm tổng số orders và pending orders
    const ordersStats = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending
      FROM orders
    `;
    const totalOrders = ordersStats[0]?.total || 0;
    const pendingOrders = ordersStats[0]?.pending || 0;

    // Tính tổng doanh thu (tổng tiền các đơn hàng đã được phê duyệt)
    const revenueStats = await sql`
      SELECT COALESCE(SUM(total_amount), 0)::numeric as total
      FROM orders
      WHERE status = 'confirmed'
    `;
    const totalRevenue = revenueStats[0]?.total ? parseFloat(revenueStats[0].total.toString()) : 0;

    // Đếm tổng số transactions và pending transactions
    const transactionsStats = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending' AND type = 'withdraw')::int as pending
      FROM transactions
    `;
    const totalTransactions = transactionsStats[0]?.total || 0;
    const pendingTransactions = transactionsStats[0]?.pending || 0;

    return NextResponse.json({
      stats: {
        totalUsers,
        newUsers,
        totalOrders,
        pendingOrders,
        totalRevenue,
        totalTransactions,
        pendingTransactions,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thống kê' },
      { status: 500 }
    );
  }
}

