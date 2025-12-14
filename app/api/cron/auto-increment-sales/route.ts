import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Cron job để tự động cộng thêm lượt bán cho tất cả sản phẩm theo interval đã cài đặt
// Endpoint này sẽ được gọi bởi Vercel Cron hoặc external cron service

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let updatedCount = 0;
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
      console.error('Auto increment sales: Unauthorized access attempt');
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
      console.log('Auto increment sales: Processing...', {
        isVercelCron,
        hasValidSecret: !!hasValidSecret,
        timestamp: new Date().toISOString(),
      });
    }

    // Lấy cấu hình sales boost
    let boostConfig: { value: number; interval_hours: number } = { value: 0, interval_hours: 0 };
    try {
      const configResult = await sql`
        SELECT value, updated_at 
        FROM settings 
        WHERE key = 'sales_boost'
        LIMIT 1
      `;

      if (configResult.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Chưa có cấu hình sales boost',
          updated_count: 0,
          timestamp: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
        });
      }

      // Parse config
      try {
        boostConfig = JSON.parse(configResult[0].value);
      } catch {
        // Nếu không phải JSON, coi như giá trị cũ
        const oldValue = parseInt(String(configResult[0].value)) || 0;
        boostConfig = { value: oldValue, interval_hours: 0 };
      }

      // Kiểm tra interval
      if (boostConfig.interval_hours === 0 || boostConfig.value === 0) {
        return NextResponse.json({
          success: true,
          message: 'Tự động cộng thêm lượt bán đã được tắt hoặc giá trị = 0',
          updated_count: 0,
          timestamp: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
        });
      }

      // Kiểm tra thời gian đã trôi qua từ lần cập nhật cuối
      const lastUpdated = new Date(configResult[0].updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      // Tính số lần cần cộng dựa trên thời gian đã trôi qua
      // Ví dụ: interval = 1 giờ, đã qua 3.5 giờ => cộng 3 lần
      const intervalsPassed = Math.floor(hoursSinceUpdate / boostConfig.interval_hours);

      if (intervalsPassed < 1) {
        return NextResponse.json({
          success: true,
          message: `Chưa đến thời gian cập nhật. Còn ${Math.ceil(boostConfig.interval_hours - hoursSinceUpdate)} giờ nữa.`,
          updated_count: 0,
          hours_since_last_update: Math.round(hoursSinceUpdate * 10) / 10,
          interval_hours: boostConfig.interval_hours,
          timestamp: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
        });
      }

      // Tính tổng giá trị cần cộng (số lần * giá trị mỗi lần)
      const totalBoostValue = intervalsPassed * boostConfig.value;

      // Cập nhật sales_count cho tất cả sản phẩm
      try {
        const updateResult = await sql`
          UPDATE products
          SET 
            sales_count = COALESCE(sales_count, 0) + ${totalBoostValue},
            updated_at = CURRENT_TIMESTAMP
          WHERE is_active = true
          RETURNING id
        `;

        updatedCount = updateResult.length;

        // Cập nhật lại thời gian cập nhật cuối cùng trong settings
        await sql`
          UPDATE settings
          SET updated_at = CURRENT_TIMESTAMP
          WHERE key = 'sales_boost'
        `;

        const executionTime = Date.now() - startTime;
        const result = {
          success: true,
          message: `Đã cộng thêm ${totalBoostValue} lượt bán (${intervalsPassed} lần × ${boostConfig.value}) cho ${updatedCount} sản phẩm`,
          updated_count: updatedCount,
          boost_value: boostConfig.value,
          intervals_passed: intervalsPassed,
          total_boost_value: totalBoostValue,
          interval_hours: boostConfig.interval_hours,
          errors: errors.length > 0 ? errors : undefined,
          timestamp: new Date().toISOString(),
          execution_time_ms: executionTime,
        };

        // Log kết quả
        if (process.env.NODE_ENV === 'development' || updatedCount > 0) {
          console.log('Auto increment sales completed:', result);
        }

        return NextResponse.json(result);
      } catch (error: any) {
        errors.push(`Error updating products: ${error.message}`);
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating products:', error);
        }
        throw error; // Re-throw để outer catch xử lý
      }

    } catch (error: any) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Lỗi khi xử lý auto increment sales',
          error_details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
          errors: errors.length > 0 ? errors : undefined,
          timestamp: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error?.message || 'Lỗi không xác định';
    
    console.error('Auto increment sales error:', {
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Lỗi khi tự động cộng thêm lượt bán',
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

