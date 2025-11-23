import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { getVietnamTime } from '@/lib/timezone-utils';

// POST: Tính lợi nhuận qua đêm cho tất cả đầu tư đang hoạt động
// Endpoint này nên được gọi bởi cron job hoặc scheduled task mỗi ngày
export async function POST(request: NextRequest) {
  try {
    // Chỉ admin mới có thể trigger tính lợi nhuận
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Lấy tất cả đầu tư đang hoạt động đã đến ngày đáo hạn (24h từ thời điểm đầu tư)
    const now = new Date(); // Lấy thời gian hiện tại (server time)
    
    // Chỉ xử lý các đầu tư đã đến ngày đáo hạn
    const investments = await sql`
      SELECT 
        id,
        user_id,
        amount,
        daily_profit_rate,
        investment_days,
        total_profit,
        maturity_date,
        created_at
      FROM investments
      WHERE status = 'active'
        AND maturity_date IS NOT NULL
        AND maturity_date <= ${now.toISOString()}
    `;

    let processedCount = 0;
    let totalReturned = 0;

    for (const investment of investments) {
      const amount = parseFloat(investment.amount.toString());
      const dailyRate = parseFloat(investment.daily_profit_rate.toString()) / 100; // Chuyển từ % sang số thập phân
      const days = investment.investment_days || 1;
      
      // Tính tổng lợi nhuận: amount * rate * số ngày
      const totalProfit = amount * dailyRate * days;
      const totalReturn = amount + totalProfit; // Gốc + lãi
      
      // Hoàn lại gốc + lãi vào ví
      await sql`
        UPDATE users
        SET 
          wallet_balance = wallet_balance + ${totalReturn},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${investment.user_id}
      `;
      
      // Cập nhật đầu tư thành completed
      await sql`
        UPDATE investments
        SET 
          status = 'completed',
          total_profit = ${totalProfit},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${investment.id}
      `;
      
      // Ghi lịch sử giao dịch
      try {
        await sql`
          INSERT INTO transactions (user_id, type, amount, status, description)
          VALUES (
            ${investment.user_id}, 
            'deposit', 
            ${totalReturn}, 
            'completed', 
            ${`Hoàn lại đầu tư (gốc + lãi ${days} ngày): ${new Intl.NumberFormat('vi-VN').format(totalReturn)} VND`}
          )
        `;
      } catch (error) {
        // Bỏ qua nếu bảng transactions chưa tồn tại
      }
      
      processedCount++;
      totalReturned += totalReturn;
    }

    return NextResponse.json({
      message: `Đã hoàn lại ${processedCount} đầu tư đáo hạn`,
      processed_count: processedCount,
      total_returned: totalReturned,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Calculate profit error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi tính lợi nhuận' },
      { status: 500 }
    );
  }
}

