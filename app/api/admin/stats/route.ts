import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

