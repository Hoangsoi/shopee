import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const investmentRateSchema = z.object({
  rates: z.array(z.object({
    min_days: z.number().int().min(1),
    max_days: z.number().int().min(1).optional(),
    rate: z.number().min(0).max(100, 'Tỷ lệ lợi nhuận không được vượt quá 100%'),
  })).min(1, 'Phải có ít nhất một mức tỷ lệ'),
});

// GET: Lấy cấu hình tỷ lệ lợi nhuận đầu tư theo số ngày
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
      WHERE key = 'investment_rates_by_days'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    let rates = [
      { min_days: 1, max_days: 6, rate: 1.00 },
      { min_days: 7, max_days: 14, rate: 2.00 },
      { min_days: 15, max_days: 29, rate: 3.00 },
      { min_days: 30, rate: 5.00 },
    ];

    if (result.length > 0) {
      try {
        const parsed = JSON.parse(result[0].value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rates = parsed;
        }
      } catch (e) {
        // Sử dụng giá trị mặc định nếu parse lỗi
      }
    } else {
      // Tạo giá trị mặc định nếu chưa có
      await sql`
        INSERT INTO settings (key, value, description)
        VALUES ('investment_rates_by_days', ${JSON.stringify(rates)}, 'Tỷ lệ lợi nhuận đầu tư theo số ngày (JSON array)')
        ON CONFLICT (key) DO NOTHING
      `;
    }

    return NextResponse.json({
      rates: rates,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get investment rates error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy cài đặt đầu tư' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật tỷ lệ lợi nhuận đầu tư theo số ngày
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = investmentRateSchema.parse(body);

    // Validate: các mức phải không trùng nhau và hợp lý
    const sortedRates = [...validatedData.rates].sort((a, b) => a.min_days - b.min_days);
    
    // Kiểm tra không có khoảng trống và không trùng nhau
    for (let i = 0; i < sortedRates.length; i++) {
      const current = sortedRates[i];
      if (current.max_days && current.max_days < current.min_days) {
        return NextResponse.json(
          { error: `Mức ${i + 1}: max_days phải >= min_days` },
          { status: 400 }
        );
      }
      
      if (i > 0) {
        const prev = sortedRates[i - 1];
        const prevMax = prev.max_days || Infinity;
        if (current.min_days <= prevMax) {
          return NextResponse.json(
            { error: 'Các mức tỷ lệ không được trùng nhau hoặc chồng chéo' },
            { status: 400 }
          );
        }
      }
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

    // Cập nhật hoặc tạo mới setting
    await sql`
      INSERT INTO settings (key, value, description)
      VALUES ('investment_rates_by_days', ${JSON.stringify(sortedRates)}, 'Tỷ lệ lợi nhuận đầu tư theo số ngày (JSON array)')
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${JSON.stringify(sortedRates)},
        description = 'Tỷ lệ lợi nhuận đầu tư theo số ngày (JSON array)',
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      message: 'Cập nhật tỷ lệ lợi nhuận đầu tư thành công',
      rates: sortedRates,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Update investment rates error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật cài đặt đầu tư' },
      { status: 500 }
    );
  }
}

