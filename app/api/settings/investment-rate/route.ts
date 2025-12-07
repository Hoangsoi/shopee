import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getInvestmentRateByDays } from '@/lib/investment-utils';

// GET: Lấy tỷ lệ lợi nhuận đầu tư (public, không cần admin)
// Có thể truyền query param ?days=X để lấy rate cho số ngày cụ thể
export async function GET(request: NextRequest) {
  try {
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

    // Lấy cấu hình rates theo số ngày - Đảm bảo lấy giá trị mới nhất
    // Sử dụng MAX(updated_at) để tránh vấn đề với nhiều records
    const result = await sql`
      SELECT value, updated_at
      FROM settings 
      WHERE key = 'investment_rates_by_days'
        AND updated_at = (
          SELECT MAX(updated_at) 
          FROM settings 
          WHERE key = 'investment_rates_by_days'
        )
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

    // Nếu có query param days, trả về rate cho số ngày đó
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    
    if (daysParam) {
      const days = parseInt(daysParam);
      if (!isNaN(days) && days > 0) {
        const rate = getInvestmentRateByDays(days, rates);
        return NextResponse.json({
          days: days,
          daily_profit_rate: rate,
          rates: rates, // Trả về tất cả rates để client có thể hiển thị
        });
      }
    }

    // Trả về tất cả rates nếu không có query param
    return NextResponse.json({
      rates: rates,
      // Giữ backward compatibility
      daily_profit_rate: rates[0]?.rate || 1.00,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get investment rate error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy tỷ lệ lợi nhuận' },
      { status: 500 }
    );
  }
}

