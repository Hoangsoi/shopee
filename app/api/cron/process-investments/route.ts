import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Cron job endpoint để tự động xử lý đầu tư đáo hạn
// Endpoint này sẽ được gọi bởi Vercel Cron hoặc external cron service
// Bảo vệ bằng secret key để tránh gọi trái phép

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra secret key từ header hoặc query param
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET || 'your-cron-secret-key-change-in-production';
    
    // Cho phép gọi từ Vercel Cron (có header đặc biệt) hoặc có secret key
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const hasValidSecret = authHeader === `Bearer ${secretKey}` || 
                          request.nextUrl.searchParams.get('secret') === secretKey;

    if (!isVercelCron && !hasValidSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy tất cả đầu tư đang hoạt động đã đến ngày đáo hạn
    const now = new Date();
    
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
    const errors: string[] = [];

    for (const investment of investments) {
      try {
        const amount = parseFloat(investment.amount.toString());
        const dailyRate = parseFloat(investment.daily_profit_rate.toString()) / 100;
        const days = investment.investment_days || 1;
        
        // Tính tổng lợi nhuận: amount * rate * số ngày
        const totalProfit = amount * dailyRate * days;
        const totalReturn = amount + totalProfit;
        
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
      } catch (error: any) {
        errors.push(`Investment ${investment.id}: ${error.message}`);
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error processing investment ${investment.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${processedCount} đầu tư đáo hạn`,
      processed_count: processedCount,
      total_returned: totalReturned,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Cron job error:', error);
    }
    return NextResponse.json(
      { 
        success: false,
        error: 'Lỗi khi xử lý đầu tư đáo hạn',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST method cũng được hỗ trợ (cho external cron services)
export async function POST(request: NextRequest) {
  return GET(request);
}

