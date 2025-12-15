import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

// GET: Lấy giá trị cộng thêm cho lượt bán
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền admin - nếu không phải admin, trả về giá trị mặc định
    const isAdminUser = await isAdmin(request);
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Đảm bảo bảng settings tồn tại
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (error: any) {
      // Bảng đã tồn tại hoặc có lỗi khác, tiếp tục
      if (process.env.NODE_ENV === 'development') {
        console.log('Settings table may already exist:', error?.message);
      }
    }

    // Lấy giá trị hiện tại (có thể là JSON string chứa value và interval)
    let result;
    try {
      result = await sql`
        SELECT value, description, updated_at 
        FROM settings 
        WHERE key = 'sales_boost'
        LIMIT 1
      `;
    } catch (error: any) {
      // Nếu có lỗi query, trả về giá trị mặc định
      if (process.env.NODE_ENV === 'development') {
        console.log('Error querying sales_boost:', error?.message);
      }
      return NextResponse.json({
        value: 0,
        interval_hours: 0,
        description: 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm',
        updated_at: new Date().toISOString(),
      });
    }

    if (result.length === 0) {
      // Tạo giá trị mặc định nếu chưa có
      const defaultConfig = JSON.stringify({ value: 0, interval_hours: 0 });
      try {
        await sql`
          INSERT INTO settings (key, value, description) 
          VALUES ('sales_boost', ${defaultConfig}, 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm')
          ON CONFLICT (key) DO NOTHING
        `;
      } catch (error: any) {
        // Nếu insert thất bại, vẫn trả về giá trị mặc định
        if (process.env.NODE_ENV === 'development') {
          console.log('Error inserting sales_boost:', error?.message);
        }
      }
      
      return NextResponse.json({
        value: 0,
        interval_hours: 0,
        description: 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm',
        updated_at: new Date().toISOString(),
      });
    }

    // Parse JSON nếu có, hoặc fallback về số cũ
    let config: { value: number; interval_hours: number };
    try {
      config = JSON.parse(result[0].value);
    } catch {
      // Nếu không phải JSON, coi như giá trị cũ (chỉ có value)
      const oldValue = parseInt(String(result[0].value)) || 0;
      config = { value: oldValue, interval_hours: 0 };
    }

    return NextResponse.json({
      value: config.value || 0,
      interval_hours: config.interval_hours || 0,
      description: result[0].description || 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm',
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    // Trả về giá trị mặc định thay vì throw error
    if (process.env.NODE_ENV === 'development') {
      logger.error('Get sales boost error', error instanceof Error ? error : new Error(String(error)));
    }
    return NextResponse.json({
      value: 0,
      description: 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm',
      updated_at: new Date().toISOString(),
    });
  }
}

// PUT: Cập nhật giá trị cộng thêm cho lượt bán (chỉ tăng, không giảm)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { value, interval_hours } = body;

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Giá trị không được để trống' },
        { status: 400 }
      );
    }

    const newValue = parseInt(String(value));
    if (isNaN(newValue) || newValue < 0) {
      return NextResponse.json(
        { error: 'Giá trị phải là số nguyên dương' },
        { status: 400 }
      );
    }

    const intervalHours = interval_hours !== undefined && interval_hours !== null 
      ? parseInt(String(interval_hours)) 
      : 0;
    
    if (intervalHours < 0) {
      return NextResponse.json(
        { error: 'Thời gian phải là số nguyên dương (0 = tắt tự động)' },
        { status: 400 }
      );
    }

    // Đảm bảo bảng settings tồn tại
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (error) {
      // Bảng đã tồn tại, tiếp tục
    }

    // Lấy giá trị hiện tại
    let currentConfig: { value: number; interval_hours: number } = { value: 0, interval_hours: 0 };
    try {
      const currentResult = await sql`
        SELECT value FROM settings WHERE key = 'sales_boost' LIMIT 1
      `;
      
      if (currentResult.length > 0) {
        try {
          currentConfig = JSON.parse(currentResult[0].value);
        } catch {
          // Nếu không phải JSON, coi như giá trị cũ
          const oldValue = parseInt(String(currentResult[0].value)) || 0;
          currentConfig = { value: oldValue, interval_hours: 0 };
        }
      }
    } catch (error) {
      // Bỏ qua lỗi
    }

    // Chỉ kiểm tra tăng giá trị nếu interval_hours = 0 (chế độ thủ công)
    // Nếu có interval, cho phép thay đổi giá trị tự do
    if (intervalHours === 0 && newValue < currentConfig.value) {
      return NextResponse.json(
        { error: 'Giá trị cộng thêm chỉ có thể tăng, không thể giảm. Giá trị hiện tại: ' + currentConfig.value },
        { status: 400 }
      );
    }

    // Lưu config dưới dạng JSON
    const configJson = JSON.stringify({ value: newValue, interval_hours: intervalHours });
    
    // Cập nhật hoặc tạo mới
    const result = await sql`
      INSERT INTO settings (key, value, description, updated_at)
      VALUES ('sales_boost', ${configJson}, 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm', CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${configJson},
        updated_at = CURRENT_TIMESTAMP
      RETURNING value, description, updated_at
    `;

    // Lưu ý: Boost được tính real-time khi hiển thị sản phẩm, không cần cập nhật database
    // updated_at trong settings sẽ được dùng để tính boost dựa trên thời gian đã trôi qua

    logger.info('Sales boost updated', { value: newValue, interval_hours: intervalHours });

    return NextResponse.json({
      success: true,
      message: intervalHours > 0 
        ? `Đã cập nhật: Cứ ${intervalHours} giờ sẽ tự động cộng thêm ${newValue} lượt bán cho tất cả sản phẩm`
        : 'Đã cập nhật giá trị cộng thêm cho lượt bán thành công',
      value: newValue,
      interval_hours: intervalHours,
      description: result[0].description,
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    logger.error('Update sales boost error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

