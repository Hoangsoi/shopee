import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Helper to check admin role
async function isAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return false;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return false;
  }
  if (!decoded.role) {
    try {
      const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
      if (users.length === 0 || users[0].role !== 'admin') {
        return false;
      }
    } catch (error) {
      console.error('Error checking role from database:', error);
      return false;
    }
  } else if (decoded.role !== 'admin') {
    return false;
  }
  return true;
}

// GET: Lấy số lượng các mục mới cần xử lý
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Đếm đơn hàng mới (pending)
    let pendingOrders = 0;
    try {
      const ordersCount = await sql`
        SELECT COUNT(*)::int as count 
        FROM orders 
        WHERE status = 'pending'
      `;
      pendingOrders = ordersCount[0]?.count || 0;
    } catch (error: any) {
      // Bảng chưa tồn tại
      if (!error.message?.includes('does not exist') && !error.message?.includes('relation')) {
        console.error('Error counting pending orders:', error);
      }
    }

    // Đếm lệnh rút tiền mới (pending withdrawals)
    let pendingWithdrawals = 0;
    try {
      const withdrawalsCount = await sql`
        SELECT COUNT(*)::int as count 
        FROM transactions 
        WHERE status = 'pending' AND type = 'withdraw'
      `;
      pendingWithdrawals = withdrawalsCount[0]?.count || 0;
    } catch (error: any) {
      // Bảng chưa tồn tại
      if (!error.message?.includes('does not exist') && !error.message?.includes('relation')) {
        console.error('Error counting pending withdrawals:', error);
      }
    }

    // Đếm khách đăng ký mới (trong 24 giờ qua)
    let newUsers = 0;
    try {
      const newUsersCount = await sql`
        SELECT COUNT(*)::int as count 
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '24 hours' AND role = 'user'
      `;
      newUsers = newUsersCount[0]?.count || 0;
    } catch (error: any) {
      // Bảng chưa tồn tại
      if (!error.message?.includes('does not exist') && !error.message?.includes('relation')) {
        console.error('Error counting new users:', error);
      }
    }

    return NextResponse.json({
      pendingOrders,
      pendingWithdrawals,
      newUsers,
    });
  } catch (error) {
    console.error('Get notifications count error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy số lượng thông báo' },
      { status: 500 }
    );
  }
}

