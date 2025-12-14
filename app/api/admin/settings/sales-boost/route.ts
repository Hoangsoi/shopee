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

    // Lấy giá trị hiện tại
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
        description: 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm',
        updated_at: new Date().toISOString(),
      });
    }

    if (result.length === 0) {
      // Tạo giá trị mặc định nếu chưa có
      try {
        await sql`
          INSERT INTO settings (key, value, description) 
          VALUES ('sales_boost', '0', 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm')
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
        description: 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm',
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      value: parseInt(String(result[0].value)) || 0,
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
    const { value } = body;

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
    const currentResult = await sql`
      SELECT value FROM settings WHERE key = 'sales_boost' LIMIT 1
    `;

    let finalValue = newValue;
    if (currentResult.length > 0) {
      const currentValue = parseInt(currentResult[0].value) || 0;
      // Chỉ cập nhật nếu giá trị mới lớn hơn giá trị hiện tại (chỉ tăng, không giảm)
      if (newValue < currentValue) {
        return NextResponse.json(
          { error: 'Giá trị cộng thêm chỉ có thể tăng, không thể giảm. Giá trị hiện tại: ' + currentValue },
          { status: 400 }
        );
      }
      finalValue = newValue;
    }

    // Cập nhật hoặc tạo mới
    const result = await sql`
      INSERT INTO settings (key, value, description, updated_at)
      VALUES ('sales_boost', ${finalValue.toString()}, 'Giá trị cộng thêm cho lượt bán của tất cả sản phẩm', CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${finalValue.toString()},
        updated_at = CURRENT_TIMESTAMP
      RETURNING value, description, updated_at
    `;

    logger.info('Sales boost updated', { value: finalValue });

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật giá trị cộng thêm cho lượt bán thành công',
      value: finalValue,
      description: result[0].description,
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    logger.error('Update sales boost error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

