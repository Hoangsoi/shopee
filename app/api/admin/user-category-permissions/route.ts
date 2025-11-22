import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

// GET: Lấy danh sách quyền truy cập category của một user
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

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Cần cung cấp user_id' },
        { status: 400 }
      );
    }

    // Lấy danh sách tất cả categories
    const allCategories = await sql`
      SELECT id, name, slug, discount_percent
      FROM categories
      ORDER BY sort_order, name
    `;

    // Lấy danh sách quyền của user
    const userPermissions = await sql`
      SELECT category_id, granted_at, granted_by
      FROM user_category_permissions
      WHERE user_id = ${parseInt(userId)}
    `;

    const permissionMap = new Map(
      userPermissions.map((p: any) => [p.category_id, p])
    );

    // Kết hợp thông tin
    const categoriesWithPermission = allCategories.map((cat: any) => ({
      category_id: cat.id,
      category_name: cat.name,
      category_slug: cat.slug,
      discount_percent: cat.discount_percent,
      has_permission: permissionMap.has(cat.id),
      granted_at: permissionMap.get(cat.id)?.granted_at || null,
      granted_by: permissionMap.get(cat.id)?.granted_by || null,
    }));

    return NextResponse.json({
      categories: categoriesWithPermission,
    });
  } catch (error) {
    console.error('Get user category permissions error:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// POST: Cấp quyền truy cập category cho user
const grantPermissionSchema = z.object({
  user_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
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
    const validatedData = grantPermissionSchema.parse(body);

    // Kiểm tra user và category có tồn tại không
    const user = await sql`SELECT id FROM users WHERE id = ${validatedData.user_id}`;
    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    const category = await sql`SELECT id FROM categories WHERE id = ${validatedData.category_id}`;
    if (category.length === 0) {
      return NextResponse.json(
        { error: 'Category không tồn tại' },
        { status: 404 }
      );
    }

    // Cấp quyền
    await sql`
      INSERT INTO user_category_permissions (user_id, category_id, granted_by)
      VALUES (${validatedData.user_id}, ${validatedData.category_id}, ${decoded.userId})
      ON CONFLICT (user_id, category_id) DO UPDATE SET
        granted_at = CURRENT_TIMESTAMP,
        granted_by = ${decoded.userId}
    `;

    return NextResponse.json({
      message: 'Đã cấp quyền thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Grant permission error:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// DELETE: Thu hồi quyền truy cập category của user
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const categoryId = searchParams.get('category_id');

    if (!userId || !categoryId) {
      return NextResponse.json(
        { error: 'Cần cung cấp user_id và category_id' },
        { status: 400 }
      );
    }

    // Thu hồi quyền
    await sql`
      DELETE FROM user_category_permissions
      WHERE user_id = ${parseInt(userId)} AND category_id = ${parseInt(categoryId)}
    `;

    return NextResponse.json({
      message: 'Đã thu hồi quyền thành công',
    });
  } catch (error) {
    console.error('Revoke permission error:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

