import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Lấy link Zalo và trạng thái từ settings (public)
export async function GET() {
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

    // Kiểm tra và tạo nếu chưa có
    const linkCheck = await sql`
      SELECT value FROM settings WHERE key = 'zalo_link'
    `;
    if (linkCheck.length === 0) {
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('zalo_link', '', 'Link chat Zalo hiển thị trên trang CSKH')
        ON CONFLICT (key) DO NOTHING
      `;
    }

    const enabledCheck = await sql`
      SELECT value FROM settings WHERE key = 'zalo_enabled'
    `;
    if (enabledCheck.length === 0) {
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('zalo_enabled', 'true', 'Hiển thị mục Zalo trên trang CSKH')
        ON CONFLICT (key) DO NOTHING
      `;
    }

    // Lấy giá trị mới nhất sau khi đảm bảo đã có
    const finalLink = await sql`
      SELECT value FROM settings WHERE key = 'zalo_link' ORDER BY updated_at DESC LIMIT 1
    `;
    const finalEnabled = await sql`
      SELECT value FROM settings WHERE key = 'zalo_enabled' ORDER BY updated_at DESC LIMIT 1
    `;

    const linkValue = finalLink[0]?.value || ''
    const enabledValue = finalEnabled[0]?.value || 'false'
    
    // Xử lý cả string và boolean
    const isEnabled = enabledValue === 'true' || enabledValue === true

    return NextResponse.json({
      link: linkValue,
      enabled: isEnabled,
    });
  } catch (error) {
    console.error('Get Zalo settings error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy cài đặt Zalo' },
      { status: 500 }
    );
  }
}

