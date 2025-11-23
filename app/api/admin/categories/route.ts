import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  slug: z.string().min(1, 'Slug không được để trống'),
  discount_percent: z.number().int().min(0).max(100),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  category_id: z.number().int().positive('ID danh mục không hợp lệ'),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  discount_percent: z.number().int().min(0).max(100).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy danh sách categories
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const categories = await sql`
      SELECT 
        id,
        name,
        slug,
        discount_percent,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM categories
      ORDER BY sort_order ASC, created_at DESC
    `;

    return NextResponse.json({
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        discount_percent: cat.discount_percent !== null && cat.discount_percent !== undefined
          ? parseInt(cat.discount_percent.toString()) || 0
          : 0,
        sort_order: cat.sort_order || 0,
        is_active: cat.is_active !== false,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách danh mục' },
      { status: 500 }
    );
  }
}

// POST: Tạo category mới
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Kiểm tra slug trùng
    const existing = await sql`
      SELECT id FROM categories WHERE slug = ${validatedData.slug}
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Slug đã tồn tại' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO categories (name, slug, discount_percent, sort_order, is_active)
      VALUES (
        ${validatedData.name},
        ${validatedData.slug},
        ${validatedData.discount_percent},
        ${validatedData.sort_order || 0},
        ${validatedData.is_active !== false}
      )
      RETURNING id, name, slug, discount_percent, sort_order, is_active, created_at
    `;

    return NextResponse.json({
      message: 'Tạo danh mục thành công',
      category: {
        ...result[0],
        discount_percent: result[0].discount_percent !== null && result[0].discount_percent !== undefined
          ? parseInt(result[0].discount_percent.toString()) || 0
          : 0,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo danh mục' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật category
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    const { category_id, ...updateData } = validatedData;

    // Kiểm tra category có tồn tại không
    const categories = await sql`
      SELECT id FROM categories WHERE id = ${category_id}
    `;
    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'Danh mục không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra slug trùng (nếu có cập nhật slug)
    if (updateData.slug) {
      const existing = await sql`
        SELECT id FROM categories WHERE slug = ${updateData.slug} AND id != ${category_id}
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Slug đã được sử dụng bởi danh mục khác' },
          { status: 400 }
        );
      }
    }

    // Cập nhật từng trường
    if (updateData.name !== undefined) {
      await sql`UPDATE categories SET name = ${updateData.name}, updated_at = CURRENT_TIMESTAMP WHERE id = ${category_id}`;
    }
    if (updateData.slug !== undefined) {
      await sql`UPDATE categories SET slug = ${updateData.slug}, updated_at = CURRENT_TIMESTAMP WHERE id = ${category_id}`;
    }
    if (updateData.discount_percent !== undefined) {
      // Đảm bảo discount_percent là số nguyên hợp lệ
      const discountValue = typeof updateData.discount_percent === 'number' 
        ? updateData.discount_percent 
        : parseInt(String(updateData.discount_percent)) || 0
      await sql`UPDATE categories SET discount_percent = ${discountValue}, updated_at = CURRENT_TIMESTAMP WHERE id = ${category_id}`;
      console.log(`Updated category ${category_id} discount_percent to:`, discountValue)
    }
    if (updateData.sort_order !== undefined) {
      await sql`UPDATE categories SET sort_order = ${updateData.sort_order}, updated_at = CURRENT_TIMESTAMP WHERE id = ${category_id}`;
    }
    if (updateData.is_active !== undefined) {
      await sql`UPDATE categories SET is_active = ${updateData.is_active}, updated_at = CURRENT_TIMESTAMP WHERE id = ${category_id}`;
    }

    // Lấy thông tin category sau khi cập nhật
    const result = await sql`
      SELECT id, name, slug, discount_percent, sort_order, is_active, updated_at
      FROM categories
      WHERE id = ${category_id}
    `;

    return NextResponse.json({
      message: 'Cập nhật danh mục thành công',
      category: {
        ...result[0],
        discount_percent: result[0].discount_percent !== null && result[0].discount_percent !== undefined
          ? parseInt(result[0].discount_percent.toString()) || 0
          : 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật danh mục' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa category
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Thiếu ID danh mục' },
        { status: 400 }
      );
    }

    const categoryIdNum = parseInt(categoryId);

    // Kiểm tra xem có sản phẩm nào thuộc category này không
    const products = await sql`
      SELECT COUNT(*)::int as count FROM products WHERE category_id = ${categoryIdNum}
    `;
    if (products[0]?.count > 0) {
      return NextResponse.json(
        { error: `Không thể xóa danh mục này vì còn ${products[0].count} sản phẩm` },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM categories WHERE id = ${categoryIdNum} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Danh mục không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Xóa danh mục thành công',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa danh mục' },
      { status: 500 }
    );
  }
}

