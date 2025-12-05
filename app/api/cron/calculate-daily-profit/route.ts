import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Cron job để tính lợi nhuận hàng ngày cho các đầu tư đang hoạt động
// Endpoint này sẽ được gọi bởi Vercel Cron hoặc external cron service
// Tính lợi nhuận tích lũy dựa trên số ngày đã trôi qua

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let processedCount = 0;
  const errors: string[] = [];

  try {
    // Kiểm tra secret key từ header hoặc query param
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET;
    
    // Cho phép gọi từ Vercel Cron (có header đặc biệt) hoặc có secret key
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const hasValidSecret = secretKey && (
      authHeader === `Bearer ${secretKey}` || 
      request.nextUrl.searchParams.get('secret') === secretKey
    );

    // Trong production, yêu cầu authentication
    if (process.env.NODE_ENV === 'production' && !isVercelCron && !hasValidSecret) {
      console.error('Calculate daily profit: Unauthorized access attempt');
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Cron job requires valid authentication. Set CRON_SECRET environment variable.',
        },
        { status: 401 }
      );
    }

    // Log trong development
    if (process.env.NODE_ENV === 'development') {
      console.log('Calculate daily profit: Processing active investments...', {
        isVercelCron,
        hasValidSecret: !!hasValidSecret,
        timestamp: new Date().toISOString(),
      });
    }

    // Lấy tất cả đầu tư đang hoạt động chưa đáo hạn
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
        created_at,
        last_profit_calculated_at
      FROM investments
      WHERE status = 'active'
        AND maturity_date IS NOT NULL
        AND maturity_date > ${now.toISOString()}
      ORDER BY created_at ASC
      LIMIT 1000
    `;

    if (investments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có đầu tư nào đang hoạt động',
        processed_count: 0,
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      });
    }

    for (const investment of investments) {
      try {
        const amount = parseFloat(investment.amount.toString());
        const dailyRate = parseFloat(investment.daily_profit_rate.toString()) / 100; // Chuyển từ % sang số thập phân
        const days = investment.investment_days || 1;
        const createdDate = new Date(investment.created_at);
        const lastCalculated = investment.last_profit_calculated_at 
          ? new Date(investment.last_profit_calculated_at) 
          : createdDate;
        
        // Tính số ngày đã trôi qua từ lần tính cuối cùng
        const nowTime = now.getTime();
        const lastCalculatedTime = lastCalculated.getTime();
        const daysSinceLastCalculation = Math.floor((nowTime - lastCalculatedTime) / (1000 * 60 * 60 * 24));
        
        // Chỉ tính nếu đã qua ít nhất 1 ngày
        if (daysSinceLastCalculation < 1) {
          continue;
        }

        // Tính lợi nhuận cho số ngày đã trôi qua (tối đa là số ngày đầu tư)
        const daysToCalculate = Math.min(daysSinceLastCalculation, days);
        const profitForPeriod = amount * dailyRate * daysToCalculate;
        
        // Lấy lợi nhuận hiện tại
        const currentProfit = parseFloat(investment.total_profit?.toString() || '0');
        
        // Cập nhật tổng lợi nhuận (tích lũy)
        const newTotalProfit = currentProfit + profitForPeriod;
        
        // Cập nhật đầu tư với lợi nhuận mới
        await sql`
          UPDATE investments
          SET 
            total_profit = ${newTotalProfit},
            last_profit_calculated_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${investment.id}
        `;
        
        processedCount++;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Updated investment ${investment.id}:`, {
            daysSinceLastCalculation,
            daysToCalculate,
            profitForPeriod,
            newTotalProfit,
          });
        }
      } catch (error: any) {
        errors.push(`Investment ${investment.id}: ${error.message}`);
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error processing investment ${investment.id}:`, error);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    const result = {
      success: true,
      message: `Đã cập nhật lợi nhuận cho ${processedCount} đầu tư`,
      processed_count: processedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };

    // Log kết quả
    if (process.env.NODE_ENV === 'development' || processedCount > 0) {
      console.log('Calculate daily profit completed:', result);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error?.message || 'Lỗi không xác định';
    
    console.error('Calculate daily profit error:', {
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Lỗi khi tính lợi nhuận hàng ngày',
        error_details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        timestamp: new Date().toISOString(),
        execution_time_ms: executionTime,
      },
      { status: 500 }
    );
  }
}

// POST method cũng được hỗ trợ (cho external cron services)
export async function POST(request: NextRequest) {
  return GET(request);
}

