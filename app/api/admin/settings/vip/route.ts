import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { calculateVipLevel } from '@/lib/vip-utils';

const vipThresholdsSchema = z.object({
  thresholds: z.array(z.number().min(0)).max(10, 'Tối đa 10 ngưỡng VIP').refine(
    (arr) => {
      // Kiểm tra các ngưỡng phải tăng dần
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] <= arr[i - 1]) {
          return false;
        }
      }
      return true;
    },
    { message: 'Các ngưỡng VIP phải tăng dần' }
  ),
});

// Helper to check admin role
async function isAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return false;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return false;
  }
  if (!decoded.role) {
    try {
      const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
      if (users.length === 0 || users[0].role !== 'admin') {
        return false;
      }
    } catch (error) {
      console.error('Error checking role from database:', error);
      return false;
    }
  } else if (decoded.role !== 'admin') {
    return false;
  }
  return true;
}

// GET: Lấy các ngưỡng VIP
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const result = await sql`
      SELECT value FROM settings 
      WHERE key = 'vip_thresholds'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    let thresholds: number[] = [];
    if (result.length > 0) {
      try {
        thresholds = JSON.parse(result[0].value);
        if (!Array.isArray(thresholds)) {
          thresholds = [];
        }
      } catch (e) {
        console.error('Error parsing VIP thresholds:', e);
        thresholds = [];
      }
    }

    return NextResponse.json({
      thresholds,
    });
  } catch (error) {
    console.error('Get VIP thresholds error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy cài đặt VIP' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật các ngưỡng VIP
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = vipThresholdsSchema.parse(body);

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
    const thresholdsJson = JSON.stringify(validatedData.thresholds);
    await sql`
      INSERT INTO settings (key, value, description)
      VALUES ('vip_thresholds', ${thresholdsJson}, 'Các ngưỡng số tiền nạp để đạt các cấp độ VIP (0-10)')
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${thresholdsJson},
        description = 'Các ngưỡng số tiền nạp để đạt các cấp độ VIP (0-10)',
        updated_at = CURRENT_TIMESTAMP
    `;

    // Đảm bảo cột vip_level tồn tại
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'vip_level'
    `;

    if (columns.length === 0) {
      await sql`ALTER TABLE users ADD COLUMN vip_level INTEGER DEFAULT 0`;
      
      // Nếu có cột is_vip cũ, migrate dữ liệu
      const oldColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip'
      `;
      
      if (oldColumns.length > 0) {
        await sql`
          UPDATE users 
          SET vip_level = CASE WHEN is_vip = true THEN 1 ELSE 0 END
        `;
      }
    }

    // Sau khi cập nhật thresholds, tự động cập nhật VIP level cho tất cả users
    // Lấy tổng số tiền đã nạp của mỗi user
    const users = await sql`
      SELECT 
        u.id,
        COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_deposit
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      GROUP BY u.id
    `;

    // Cập nhật VIP level cho từng user
    for (const user of users) {
      const totalDeposit = parseFloat(user.total_deposit?.toString() || '0');
      const vipLevel = calculateVipLevel(totalDeposit, validatedData.thresholds);

      await sql`
        UPDATE users 
        SET vip_level = ${vipLevel}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${user.id}
      `;
    }

    return NextResponse.json({
      message: 'Cập nhật cài đặt VIP thành công. Tất cả khách hàng đã được cập nhật cấp độ VIP tự động.',
      thresholds: validatedData.thresholds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update VIP thresholds error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật cài đặt VIP' },
      { status: 500 }
    );
  }
}

