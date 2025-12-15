import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Cron job master để chạy các tác vụ hàng ngày lúc 0:00 AM
// Gộp process-investments và auto-increment-sales để tiết kiệm số lượng cron jobs
// Endpoint này sẽ được gọi bởi Vercel Cron

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: any = {
    process_investments: null,
    auto_increment_sales: null,
  };

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
      console.error('Daily tasks cron: Unauthorized access attempt');
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
      console.log('Daily tasks cron: Starting...', {
        isVercelCron,
        hasValidSecret: !!hasValidSecret,
        timestamp: new Date().toISOString(),
      });
    }

    // ========== TASK 1: Process Investments ==========
    try {
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

      let processedCount = 0;
      let totalReturned = 0;
      const errors: string[] = [];

      if (investments.length > 0) {
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
            }
            
            processedCount++;
            totalReturned += totalReturn;
          } catch (error: any) {
            errors.push(`Investment ${investment.id}: ${error.message}`);
          }
        }
      }

      results.process_investments = {
        success: true,
        message: investments.length === 0 
          ? 'Không có đầu tư nào đáo hạn'
          : `Đã xử lý ${processedCount} đầu tư đáo hạn`,
        processed_count: processedCount,
        total_returned: totalReturned,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      results.process_investments = {
        success: false,
        error: error?.message || 'Lỗi khi xử lý đầu tư đáo hạn',
      };
    }

    // ========== TASK 2: Auto Increment Sales ==========
    try {
      // Lấy cấu hình sales boost
      let boostConfig: { value: number; interval_hours: number } = { value: 0, interval_hours: 0 };
      
      const configResult = await sql`
        SELECT value, updated_at 
        FROM settings 
        WHERE key = 'sales_boost'
        LIMIT 1
      `;

      if (configResult.length > 0) {
        // Parse config
        try {
          boostConfig = JSON.parse(configResult[0].value);
        } catch {
          // Nếu không phải JSON, coi như giá trị cũ
          const oldValue = parseInt(String(configResult[0].value)) || 0;
          boostConfig = { value: oldValue, interval_hours: 0 };
        }

        // Kiểm tra interval
        if (boostConfig.interval_hours > 0 && boostConfig.value > 0) {
          // Kiểm tra thời gian đã trôi qua từ lần cập nhật cuối
          const lastUpdated = new Date(configResult[0].updated_at);
          const now = new Date();
          const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

          // Tính số lần cần cộng dựa trên thời gian đã trôi qua
          const intervalsPassed = Math.floor(hoursSinceUpdate / boostConfig.interval_hours);

          if (intervalsPassed >= 1) {
            // Tính tổng giá trị cần cộng (số lần * giá trị mỗi lần)
            const totalBoostValue = intervalsPassed * boostConfig.value;

            // Cập nhật sales_count cho tất cả sản phẩm
            const updateResult = await sql`
              UPDATE products
              SET 
                sales_count = COALESCE(sales_count, 0) + ${totalBoostValue},
                updated_at = CURRENT_TIMESTAMP
              WHERE is_active = true
              RETURNING id
            `;

            // Cập nhật lại thời gian cập nhật cuối cùng trong settings
            await sql`
              UPDATE settings
              SET updated_at = CURRENT_TIMESTAMP
              WHERE key = 'sales_boost'
            `;

            results.auto_increment_sales = {
              success: true,
              message: `Đã cộng thêm ${totalBoostValue} lượt bán (${intervalsPassed} lần × ${boostConfig.value}) cho ${updateResult.length} sản phẩm`,
              updated_count: updateResult.length,
              intervals_passed: intervalsPassed,
              total_boost_value: totalBoostValue,
            };
          } else {
            results.auto_increment_sales = {
              success: true,
              message: 'Chưa đến thời gian cập nhật',
              updated_count: 0,
            };
          }
        } else {
          results.auto_increment_sales = {
            success: true,
            message: 'Tự động cộng thêm lượt bán đã được tắt hoặc giá trị = 0',
            updated_count: 0,
          };
        }
      } else {
        results.auto_increment_sales = {
          success: true,
          message: 'Chưa có cấu hình sales boost',
          updated_count: 0,
        };
      }
    } catch (error: any) {
      results.auto_increment_sales = {
        success: false,
        error: error?.message || 'Lỗi khi tự động cộng thêm lượt bán',
      };
    }

    const executionTime = Date.now() - startTime;
    const allSuccess = results.process_investments?.success && results.auto_increment_sales?.success;

    return NextResponse.json({
      success: allSuccess,
      message: 'Đã hoàn thành các tác vụ hàng ngày',
      results,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    });
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error?.message || 'Lỗi không xác định';
    
    console.error('Daily tasks cron error:', {
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Lỗi khi thực thi các tác vụ hàng ngày',
        error_details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        results,
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

