import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Lấy tỷ lệ lợi nhuận đầu tư (public, không cần admin)
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

    const result = await sql`
      SELECT value 
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
      { error: 'Lỗi khi lấy tỷ lệ lợi nhuận' },
      { status: 500 }
    );
  }
}

