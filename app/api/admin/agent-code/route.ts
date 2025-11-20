import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Lấy mã đại lý hiện tại
export async function GET() {
  try {
    const result = await sql`
      SELECT value, description, updated_at 
      FROM settings 
      WHERE key = 'valid_agent_code'
    `;

    if (result.length === 0) {
      // Tạo mã mặc định nếu chưa có
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
        ON CONFLICT (key) DO NOTHING
      `;
      
      return NextResponse.json({
        value: 'SH6688',
        description: 'Mã đại lý hợp lệ để đăng ký',
      });
    }

    return NextResponse.json({
      value: result[0].value,
      description: result[0].description,
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    console.error('Get agent code error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy mã đại lý' },
      { status: 500 }
    );
  }
}

// Cập nhật mã đại lý (cần authentication - tạm thời để public, nên thêm auth sau)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { value } = body;

    if (!value || typeof value !== 'string' || value.trim() === '') {
      return NextResponse.json(
        { error: 'Mã đại lý không hợp lệ' },
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
      console.error('Settings table setup error:', error);
    }

    // Cập nhật hoặc tạo mới
    const result = await sql`
      INSERT INTO settings (key, value, description) 
      VALUES ('valid_agent_code', ${value.trim()}, 'Mã đại lý hợp lệ để đăng ký')
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
      RETURNING value, updated_at
    `;

    return NextResponse.json({
      message: 'Cập nhật mã đại lý thành công',
      value: result[0].value,
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    console.error('Update agent code error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật mã đại lý' },
      { status: 500 }
    );
  }
}

