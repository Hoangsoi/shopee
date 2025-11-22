import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET: Lấy danh sách quyền truy cập category của user hiện tại
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

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Lấy danh sách category mà user có quyền truy cập
    const permissions = await sql`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.discount_percent,
        ucp.granted_at
      FROM user_category_permissions ucp
      JOIN categories c ON ucp.category_id = c.id
      WHERE ucp.user_id = ${decoded.userId}
      ORDER BY c.sort_order, c.name
    `;

    return NextResponse.json({
      permissions: permissions.map((p: any) => ({
        category_id: p.id,
        category_name: p.name,
        category_slug: p.slug,
        discount_percent: p.discount_percent,
        granted_at: p.granted_at,
      })),
    });
  } catch (error) {
    console.error('Get category permissions error:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

