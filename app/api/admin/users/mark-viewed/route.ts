import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// POST: Đánh dấu admin đã xem trang quản lý người dùng
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
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

    // Cập nhật hoặc tạo mới thời điểm xem
    const now = new Date().toISOString();
    await sql`
      INSERT INTO settings (key, value, description, updated_at)
      VALUES ('last_viewed_users_at', ${now}, 'Thời điểm admin cuối cùng xem trang quản lý người dùng', NOW())
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${now},
        updated_at = NOW()
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Đã đánh dấu đã xem',
      viewed_at: now
    });
  } catch (error) {
    console.error('Mark viewed error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đánh dấu đã xem' },
      { status: 500 }
    );
  }
}

