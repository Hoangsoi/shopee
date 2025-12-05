import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// POST: Cập nhật trạng thái tất cả đầu tư dựa trên maturity_date
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Cập nhật các đầu tư đã đáo hạn (maturity_date <= now()) thành 'completed'
    const expiredResult = await sql`
      UPDATE investments
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
        AND maturity_date IS NOT NULL
        AND maturity_date <= CURRENT_TIMESTAMP
      RETURNING id, user_id, amount, maturity_date
    `;

    // Cập nhật các đầu tư chưa đáo hạn (maturity_date > now()) thành 'active' (nếu đang completed nhưng chưa đáo hạn - trường hợp hiếm)
    const activeResult = await sql`
      UPDATE investments
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'completed'
        AND maturity_date IS NOT NULL
        AND maturity_date > CURRENT_TIMESTAMP
      RETURNING id, user_id, amount, maturity_date
    `;

    // Đếm tổng số đầu tư theo trạng thái
    const statusCounts = await sql`
      SELECT 
        status,
        COUNT(*)::int as count
      FROM investments
      GROUP BY status
    `;

    const counts: { [key: string]: number } = {};
    statusCounts.forEach((row: any) => {
      counts[row.status] = row.count;
    });

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật trạng thái đầu tư thành công',
      updated: {
        expired: expiredResult.length,
        reactivated: activeResult.length,
      },
      expired_investments: expiredResult.map((inv: any) => ({
        id: inv.id,
        user_id: inv.user_id,
        amount: parseFloat(inv.amount.toString()),
        maturity_date: inv.maturity_date,
      })),
      status_counts: counts,
    });
  } catch (error) {
    console.error('Update investment status error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật trạng thái đầu tư', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Xem thống kê trạng thái đầu tư
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Đếm số đầu tư theo trạng thái
    const statusCounts = await sql`
      SELECT 
        status,
        COUNT(*)::int as count
      FROM investments
      GROUP BY status
    `;

    // Đếm số đầu tư đã đáo hạn nhưng vẫn active
    const expiredButActive = await sql`
      SELECT COUNT(*)::int as count
      FROM investments
      WHERE status = 'active'
        AND maturity_date IS NOT NULL
        AND maturity_date <= CURRENT_TIMESTAMP
    `;

    // Đếm số đầu tư chưa đáo hạn nhưng đã completed
    const notExpiredButCompleted = await sql`
      SELECT COUNT(*)::int as count
      FROM investments
      WHERE status = 'completed'
        AND maturity_date IS NOT NULL
        AND maturity_date > CURRENT_TIMESTAMP
    `;

    const counts: { [key: string]: number } = {};
    statusCounts.forEach((row: any) => {
      counts[row.status] = row.count;
    });

    return NextResponse.json({
      success: true,
      status_counts: counts,
      issues: {
        expired_but_active: expiredButActive[0]?.count || 0,
        not_expired_but_completed: notExpiredButCompleted[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get investment status stats error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thống kê trạng thái đầu tư' },
      { status: 500 }
    );
  }
}

