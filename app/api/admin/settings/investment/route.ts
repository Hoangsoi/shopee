import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const investmentRateSchema = z.object({
  daily_profit_rate: z.number().min(0).max(100, 'Tỷ lệ lợi nhuận không được vượt quá 100%'),
});

// GET: Lấy tỷ lệ lợi nhuận đầu tư
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Đảm bảo bảng settings tồn tại
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const result = await sql`
      SELECT value, description, updated_at 
      FROM settings 
      WHERE key = 'investment_daily_profit_rate'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    let dailyProfitRate = 1.00; // Mặc định 1%
    if (result.length > 0) {
      dailyProfitRate = parseFloat(result[0].value) || 1.00;
    } else {
      // Tạo giá trị mặc định nếu chưa có
      await sql`
        INSERT INTO settings (key, value, description)
        VALUES ('investment_daily_profit_rate', '1.00', 'Tỷ lệ lợi nhuận qua đêm (%) cho đầu tư')
        ON CONFLICT (key) DO NOTHING
      `;
    }

    return NextResponse.json({
      daily_profit_rate: dailyProfitRate,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get investment rate error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy cài đặt đầu tư' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật tỷ lệ lợi nhuận đầu tư
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = investmentRateSchema.parse(body);

    // Đảm bảo bảng settings tồn tại
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Cập nhật hoặc tạo mới setting
    await sql`
      INSERT INTO settings (key, value, description)
      VALUES ('investment_daily_profit_rate', ${validatedData.daily_profit_rate.toString()}, 'Tỷ lệ lợi nhuận qua đêm (%) cho đầu tư')
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${validatedData.daily_profit_rate.toString()},
        description = 'Tỷ lệ lợi nhuận qua đêm (%) cho đầu tư',
        updated_at = CURRENT_TIMESTAMP
    `;

    // Cập nhật tỷ lệ cho các đầu tư mới (không ảnh hưởng đến đầu tư đã tạo)
    // Chỉ cập nhật cho các đầu tư chưa có last_profit_calculated_at (đầu tư mới)

    return NextResponse.json({
      message: 'Cập nhật tỷ lệ lợi nhuận đầu tư thành công',
      daily_profit_rate: validatedData.daily_profit_rate,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Update investment rate error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật cài đặt đầu tư' },
      { status: 500 }
    );
  }
}

