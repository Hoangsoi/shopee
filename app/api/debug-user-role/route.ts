import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// API để debug role của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        error: 'Chưa đăng nhập',
        hasToken: false,
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({
        error: 'Token không hợp lệ',
        hasToken: true,
        tokenValid: false,
      });
    }

    // Lấy thông tin user từ database
    const users = await sql`
      SELECT 
        id,
        email,
        name,
        role,
        created_at,
        updated_at
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (users.length === 0) {
      return NextResponse.json({
        error: 'User không tồn tại',
        tokenUserId: decoded.userId,
      });
    }

    const user = users[0];
    const tokenRole = decoded.role || 'user';
    const dbRole = user.role || 'user';
    const tokenRoleNormalized = tokenRole.toString().trim().toLowerCase();
    const dbRoleNormalized = dbRole.toString().trim().toLowerCase();

    return NextResponse.json({
      success: true,
      token: {
        userId: decoded.userId,
        email: decoded.identifier || decoded.email,
        role: tokenRole,
        roleNormalized: tokenRoleNormalized,
      },
      database: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: dbRole,
        roleNormalized: dbRoleNormalized,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      comparison: {
        rolesMatch: tokenRoleNormalized === dbRoleNormalized,
        isAdminInToken: tokenRoleNormalized === 'admin',
        isAdminInDatabase: dbRoleNormalized === 'admin',
        shouldRedirectToAdmin: dbRoleNormalized === 'admin',
      },
      recommendation: dbRoleNormalized === 'admin' && tokenRoleNormalized !== 'admin'
        ? 'Token có role cũ. Vui lòng đăng xuất và đăng nhập lại để tạo token mới với role admin.'
        : dbRoleNormalized === 'admin'
        ? 'Token và database đều có role admin. Bạn nên được redirect đến trang admin.'
        : 'User không phải admin.',
    });
  } catch (error) {
    console.error('Debug user role error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi khi debug',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

