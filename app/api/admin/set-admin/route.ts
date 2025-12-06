import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

// API để set role admin cho user (chỉ admin mới được dùng)
export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền admin
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Cần cung cấp userId hoặc email' },
        { status: 400 }
      );
    }

    // Đảm bảo cột role tồn tại
    try {
      const checkRole = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `;
      if (checkRole.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
        logger.info('Đã thêm cột role vào bảng users');
      }
    } catch (error) {
      logger.debug('Role column may already exist');
    }

    // Cập nhật role thành admin
    let result;
    if (userId) {
      result = await sql`
        UPDATE users 
        SET role = 'admin', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
        RETURNING id, email, name, role
      `;
    } else {
      result = await sql`
        UPDATE users 
        SET role = 'admin', updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email}
        RETURNING id, email, name, role
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy user' },
        { status: 404 }
      );
    }

    logger.info('Set admin role thành công', { userId: result[0].id, email: result[0].email });
    
    return NextResponse.json({
      message: 'Đã set role admin thành công',
      user: result[0],
    });
  } catch (error) {
    logger.error('Set admin error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

