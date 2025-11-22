import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET: Lấy link Zalo và trạng thái từ settings (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
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
    } catch (error) {
      // Bảng đã tồn tại, tiếp tục
    }

    const linkResult = await sql`
      SELECT value, description, updated_at 
      FROM settings 
      WHERE key = 'zalo_link'
    `;

    const enabledResult = await sql`
      SELECT value 
      FROM settings 
      WHERE key = 'zalo_enabled'
    `;

    if (linkResult.length === 0) {
      // Tạo giá trị mặc định nếu chưa có
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('zalo_link', '', 'Link chat Zalo hiển thị trên trang CSKH')
        ON CONFLICT (key) DO NOTHING
      `;
    }

    if (enabledResult.length === 0) {
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('zalo_enabled', 'true', 'Hiển thị mục Zalo trên trang CSKH')
        ON CONFLICT (key) DO NOTHING
      `;
    }

    const finalLink = await sql`
      SELECT value FROM settings WHERE key = 'zalo_link' ORDER BY updated_at DESC LIMIT 1
    `;
    const finalEnabled = await sql`
      SELECT value FROM settings WHERE key = 'zalo_enabled' ORDER BY updated_at DESC LIMIT 1
    `;

    const linkValue = finalLink[0]?.value || ''
    const enabledValue = finalEnabled[0]?.value || 'false'
    const isEnabled = enabledValue === 'true' || String(enabledValue).toLowerCase() === 'true'

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

// PUT: Cập nhật link Zalo và trạng thái (admin only)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { link, enabled } = body;

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

    // Cập nhật link Zalo
    if (link !== undefined) {
      const linkValue = link || ''
      await sql`
        INSERT INTO settings (key, value, description, updated_at)
        VALUES ('zalo_link', ${linkValue}, 'Link chat Zalo hiển thị trên trang CSKH', CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    // Cập nhật trạng thái enabled - đảm bảo luôn là string 'true' hoặc 'false'
    if (enabled !== undefined) {
      const enabledValue = enabled === true || enabled === 'true' || String(enabled).toLowerCase() === 'true' ? 'true' : 'false'
      await sql`
        INSERT INTO settings (key, value, description, updated_at)
        VALUES ('zalo_enabled', ${enabledValue}, 'Hiển thị mục Zalo trên trang CSKH', CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    return NextResponse.json({
      message: 'Cập nhật cài đặt Zalo thành công',
      link: link !== undefined ? link : undefined,
      enabled: enabled !== undefined ? enabled : undefined,
    });
  } catch (error) {
    console.error('Update Zalo settings error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật cài đặt Zalo' },
      { status: 500 }
    );
  }
}

