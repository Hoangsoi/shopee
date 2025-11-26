import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Cron job endpoint để tự động xử lý đầu tư đáo hạn
// Endpoint này sẽ được gọi bởi Vercel Cron hoặc external cron service
// Bảo vệ bằng secret key để tránh gọi trái phép
//
// Setup trong Vercel:
// 1. Thêm biến môi trường CRON_SECRET trong Vercel Dashboard
// 2. Vercel Cron sẽ tự động gọi endpoint này theo schedule trong vercel.json
// 3. Nếu dùng external cron service, gọi với: Authorization: Bearer <CRON_SECRET>

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let processedCount = 0;
  let totalReturned = 0;
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
      console.error('Cron job: Unauthorized access attempt');
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
      console.log('Cron job: Processing investments...', {
        isVercelCron,
        hasValidSecret: !!hasValidSecret,
        timestamp: new Date().toISOString(),
      });
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
      ORDER BY maturity_date ASC
      LIMIT 100
    `;

    if (investments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có đầu tư nào đáo hạn',
        processed_count: 0,
        total_returned: 0,
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      });
    }

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
        
        // Ghi lịch sử giao dịch - TÁCH RÕ: Hoàn gốc và Hoàn hoa hồng
        try {
          const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
          const formattedProfit = new Intl.NumberFormat('vi-VN').format(totalProfit);
          
          // Transaction 1: Hoàn gốc
          await sql`
            INSERT INTO transactions (user_id, type, amount, status, description)
            VALUES (
              ${investment.user_id}, 
              'deposit', 
              ${amount}, 
              'completed', 
              ${`Hoàn gốc đầu tư: ${formattedAmount} VND`}
            )
          `;
          
          // Transaction 2: Hoàn hoa hồng (lãi)
          await sql`
            INSERT INTO transactions (user_id, type, amount, status, description)
            VALUES (
              ${investment.user_id}, 
              'deposit', 
              ${totalProfit}, 
              'completed', 
              ${`Hoàn hoa hồng đầu tư (${days} ngày, ${investment.daily_profit_rate}%/ngày): ${formattedProfit} VND`}
            )
          `;
        } catch (error) {
          // Bỏ qua nếu bảng transactions chưa tồn tại
          if (process.env.NODE_ENV === 'development') {
            console.error('Error creating transactions:', error);
          }
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

    const executionTime = Date.now() - startTime;
    const result = {
      success: true,
      message: `Đã xử lý ${processedCount} đầu tư đáo hạn`,
      processed_count: processedCount,
      total_returned: totalReturned,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };

    // Log kết quả
    if (process.env.NODE_ENV === 'development' || processedCount > 0) {
      console.log('Cron job completed:', result);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error?.message || 'Lỗi không xác định';
    
    console.error('Cron job error:', {
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Lỗi khi xử lý đầu tư đáo hạn',
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

