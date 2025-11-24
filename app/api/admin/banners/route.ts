import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

// Helper để validate image_url (có thể là URL hoặc base64)
const imageUrlSchema = z.string().min(1, 'URL ảnh không được để trống').refine(
  (val) => {
    // Chấp nhận URL hợp lệ
    try {
      new URL(val);
      return true;
    } catch {
      // Nếu không phải URL, kiểm tra xem có phải base64 không
      return val.startsWith('data:image/');
    }
  },
  {
    message: 'URL ảnh phải là URL hợp lệ hoặc base64 string (data:image/...)',
  }
);

const bannerSchema = z.object({
  image_url: imageUrlSchema,
  title: z.string().optional(),
  link_url: z.string().url('URL liên kết không hợp lệ').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const updateBannerSchema = z.object({
  banner_id: z.number().int().positive('ID banner không hợp lệ'),
  image_url: imageUrlSchema.optional(),
  title: z.string().optional(),
  link_url: z.string().url('URL liên kết không hợp lệ').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy danh sách banners (chỉ admin)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    try {
      const banners = await sql`
        SELECT id, image_url, title, link_url, is_active, sort_order, created_at, updated_at
        FROM banners
        ORDER BY sort_order ASC, created_at ASC
      `;

      return NextResponse.json({
        banners: banners.map((banner: any) => ({
          id: banner.id,
          image_url: banner.image_url,
          title: banner.title || '',
          link_url: banner.link_url || null,
          is_active: banner.is_active,
          sort_order: banner.sort_order,
          created_at: banner.created_at,
          updated_at: banner.updated_at,
        })),
      });
    } catch (dbError: any) {
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
        return NextResponse.json({
          banners: [],
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Get banners error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách banner' },
      { status: 500 }
    );
  }
}

// POST: Tạo banner mới (chỉ admin)
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = bannerSchema.parse(body);

    const result = await sql`
      INSERT INTO banners (image_url, title, link_url, is_active, sort_order)
      VALUES (${validatedData.image_url}, ${validatedData.title || null}, ${validatedData.link_url || null}, ${validatedData.is_active ?? true}, ${validatedData.sort_order ?? 0})
      RETURNING id, image_url, title, link_url, is_active, sort_order, created_at, updated_at
    `;

    return NextResponse.json({
      message: 'Thêm banner thành công',
      banner: {
        id: result[0].id,
        image_url: result[0].image_url,
        title: result[0].title || '',
        link_url: result[0].link_url || null,
        is_active: result[0].is_active,
        sort_order: result[0].sort_order,
        created_at: result[0].created_at,
        updated_at: result[0].updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create banner error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo banner' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật banner (chỉ admin)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateBannerSchema.parse(body);

    const { banner_id, ...updateData } = validatedData;

    // Cập nhật từng trường
    if (updateData.image_url !== undefined) {
      // Nếu là base64, giữ nguyên (có thể upload lên Vercel Blob sau)
      // Hoặc có thể xử lý upload ở đây nếu cần
      const imageUrl = updateData.image_url.trim() || null;
      await sql`UPDATE banners SET image_url = ${imageUrl}, updated_at = CURRENT_TIMESTAMP WHERE id = ${banner_id}`;
    }
    if (updateData.title !== undefined) {
      await sql`UPDATE banners SET title = ${updateData.title || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${banner_id}`;
    }
    if (updateData.link_url !== undefined) {
      await sql`UPDATE banners SET link_url = ${updateData.link_url || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${banner_id}`;
    }
    if (updateData.is_active !== undefined) {
      await sql`UPDATE banners SET is_active = ${updateData.is_active}, updated_at = CURRENT_TIMESTAMP WHERE id = ${banner_id}`;
    }
    if (updateData.sort_order !== undefined) {
      await sql`UPDATE banners SET sort_order = ${updateData.sort_order}, updated_at = CURRENT_TIMESTAMP WHERE id = ${banner_id}`;
    }

    const result = await sql`
      SELECT id, image_url, title, link_url, is_active, sort_order, created_at, updated_at
      FROM banners
      WHERE id = ${banner_id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Banner không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Cập nhật banner thành công',
      banner: {
        id: result[0].id,
        image_url: result[0].image_url,
        title: result[0].title || '',
        link_url: result[0].link_url || null,
        is_active: result[0].is_active,
        sort_order: result[0].sort_order,
        created_at: result[0].created_at,
        updated_at: result[0].updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Validation error:', error.errors);
      }
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('Update banner error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật banner' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa banner (chỉ admin)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bannerId = searchParams.get('id');

    if (!bannerId) {
      return NextResponse.json(
        { error: 'Thiếu ID banner' },
        { status: 400 }
      );
    }

    const bannerIdNum = parseInt(bannerId);

    const result = await sql`
      DELETE FROM banners WHERE id = ${bannerIdNum} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Banner không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Xóa banner thành công',
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa banner' },
      { status: 500 }
    );
  }
}

