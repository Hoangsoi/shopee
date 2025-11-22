import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET: Lấy số Zalo từ settings (admin only)
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

// PUT: Cập nhật số Zalo (admin only)
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
    const { value } = body;

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Số Zalo không được để trống' },
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

    // Cập nhật hoặc tạo mới
    const result = await sql`
      INSERT INTO settings (key, value, description, updated_at)
      VALUES ('zalo_number', ${value}, 'Số Zalo hiển thị trên trang CSKH', CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
      RETURNING value, updated_at
    `;

    return NextResponse.json({
      message: 'Cập nhật số Zalo thành công',
      value: result[0].value,
      updated_at: result[0].updated_at,
    });
  } catch (error) {
    console.error('Update Zalo number error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật số Zalo' },
      { status: 500 }
    );
  }
}

