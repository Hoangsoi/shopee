import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET: Lấy danh sách tất cả đầu tư (admin only)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Kiểm tra và tạo bảng investments nếu chưa có
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS investments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15, 2) NOT NULL,
          daily_profit_rate DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
          investment_days INTEGER NOT NULL DEFAULT 1,
          total_profit DECIMAL(15, 2) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          maturity_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_profit_calculated_at TIMESTAMP
        )
      `;
      
      // Thêm các cột nếu chưa có
      try {
        await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS investment_days INTEGER DEFAULT 1`;
      } catch (error) {
        // Cột đã tồn tại
      }
      try {
        await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMP`;
      } catch (error) {
        // Cột đã tồn tại
      }
    } catch (error) {
      // Bảng đã tồn tại, tiếp tục
      if (process.env.NODE_ENV === 'development') {
        console.log('Investments table already exists or error creating:', error);
      }
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status: 'active', 'completed', or null (all)
    const userId = searchParams.get('userId'); // Filter by user ID

    // Build query với điều kiện động
    let investments;
    if (status && userId) {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        investments = await sql`
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
          WHERE i.status = ${status} AND i.user_id = ${userIdNum}
          ORDER BY i.created_at DESC
        `;
      } else {
        investments = await sql`
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
          WHERE i.status = ${status}
          ORDER BY i.created_at DESC
        `;
      }
    } else if (status) {
      investments = await sql`
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
        WHERE i.status = ${status}
        ORDER BY i.created_at DESC
      `;
    } else if (userId) {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        investments = await sql`
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
          WHERE i.user_id = ${userIdNum}
          ORDER BY i.created_at DESC
        `;
      } else {
        investments = await sql`
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
          ORDER BY i.created_at DESC
        `;
      }
    } else {
      investments = await sql`
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
        ORDER BY i.created_at DESC
      `;
    }

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
        user_email: inv.email || null,
        user_name: inv.name || null,
        user_phone: inv.phone || null,
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
      { 
        error: 'Lỗi khi lấy danh sách đầu tư',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

