import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Lấy số Zalo từ settings
export async function GET() {
  try {
    const result = await sql`
      SELECT value, description, updated_at 
      FROM settings 
      WHERE key = 'zalo_number'
    `;

    if (result.length === 0) {
      // Tạo giá trị mặc định nếu chưa có
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('zalo_number', '', 'Số Zalo hiển thị trên trang CSKH')
        ON CONFLICT (key) DO NOTHING
      `;
      
      return NextResponse.json({
        value: '',
        description: 'Số Zalo hiển thị trên trang CSKH',
      });
    }

    return NextResponse.json({
      value: result[0].value,
      description: result[0].description,
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    console.error('Get Zalo number error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy số Zalo' },
      { status: 500 }
    );
  }
}

