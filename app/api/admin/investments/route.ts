import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET: Lấy danh sách tất cả đầu tư (admin only)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status: 'active', 'completed', or null (all)
    const userId = searchParams.get('userId'); // Filter by user ID

    // Build query
    let query = sql`
      SELECT 
        i.id,
        i.user_id,
        i.amount,
        i.daily_profit_rate,
        i.investment_days,
        i.total_profit,
        i.status,
        i.maturity_date,
        i.created_at,
        i.updated_at,
        i.last_profit_calculated_at,
        u.email,
        u.name,
        u.phone
      FROM investments i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;

    // Apply filters
    if (status) {
      query = sql`
        ${query}
        AND i.status = ${status}
      `;
    }

    if (userId) {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        query = sql`
          ${query}
          AND i.user_id = ${userIdNum}
        `;
      }
    }

    query = sql`
      ${query}
      ORDER BY i.created_at DESC
    `;

    const investments = await query;

    // Tính tổng thống kê
    const stats = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'active')::int as active_count,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0)::decimal as total_active_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::decimal as total_completed_amount,
        COALESCE(SUM(total_profit) FILTER (WHERE status = 'active'), 0)::decimal as total_active_profit,
        COALESCE(SUM(total_profit) FILTER (WHERE status = 'completed'), 0)::decimal as total_completed_profit
      FROM investments
    `;

    // Đếm các đầu tư có vấn đề
    const issues = await sql`
      SELECT 
        COUNT(*) FILTER (
          WHERE status = 'active' 
          AND maturity_date IS NOT NULL 
          AND maturity_date <= CURRENT_TIMESTAMP
        )::int as expired_but_active,
        COUNT(*) FILTER (
          WHERE status = 'completed' 
          AND maturity_date IS NOT NULL 
          AND maturity_date > CURRENT_TIMESTAMP
        )::int as not_expired_but_completed
      FROM investments
    `;

    return NextResponse.json({
      success: true,
      investments: investments.map((inv: any) => ({
        id: inv.id,
        user_id: inv.user_id,
        user_email: inv.email,
        user_name: inv.name,
        user_phone: inv.phone,
        amount: parseFloat(inv.amount.toString()),
        daily_profit_rate: parseFloat(inv.daily_profit_rate.toString()),
        investment_days: inv.investment_days || 1,
        total_profit: parseFloat(inv.total_profit?.toString() || '0'),
        status: inv.status,
        maturity_date: inv.maturity_date,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        last_profit_calculated_at: inv.last_profit_calculated_at,
      })),
      stats: {
        total: stats[0]?.total || 0,
        active_count: stats[0]?.active_count || 0,
        completed_count: stats[0]?.completed_count || 0,
        total_active_amount: parseFloat(stats[0]?.total_active_amount?.toString() || '0'),
        total_completed_amount: parseFloat(stats[0]?.total_completed_amount?.toString() || '0'),
        total_active_profit: parseFloat(stats[0]?.total_active_profit?.toString() || '0'),
        total_completed_profit: parseFloat(stats[0]?.total_completed_profit?.toString() || '0'),
      },
      issues: {
        expired_but_active: issues[0]?.expired_but_active || 0,
        not_expired_but_completed: issues[0]?.not_expired_but_completed || 0,
      },
    });
  } catch (error) {
    console.error('Get admin investments error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách đầu tư' },
      { status: 500 }
    );
  }
}

