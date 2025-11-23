import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  slug: z.string().min(1, 'Slug không được để trống'),
  description: z.string().optional(),
  price: z.number().positive('Giá phải lớn hơn 0'),
  original_price: z.number().positive().optional(),
  image_url: z.union([
    z.string().url('URL hình ảnh không hợp lệ'),
    z.literal(''),
    z.null(),
  ]).optional(),
  category_id: z.number().int().positive().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
});

const updateProductSchema = z.object({
  product_id: z.number().int().positive('ID sản phẩm không hợp lệ'),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  original_price: z.number().positive().optional(),
  image_url: z.union([
    z.string().url('URL hình ảnh không hợp lệ'),
    z.literal(''),
    z.null(),
  ]).optional(),
  category_id: z.number().int().positive().optional().nullable(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy danh sách products
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    const isActive = searchParams.get('is_active');
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Get total count for pagination
    let totalCount = 0;
    let totalPages = 0;
    try {
      let countQuery;
      if (categoryId) {
        countQuery = sql`SELECT COUNT(*)::int as count FROM products WHERE category_id = ${parseInt(categoryId)}`;
      } else if (search) {
        countQuery = sql`SELECT COUNT(*)::int as count FROM products WHERE name ILIKE ${'%' + search + '%'}`;
      } else if (isActive !== null) {
        countQuery = sql`SELECT COUNT(*)::int as count FROM products WHERE is_active = ${isActive === 'true'}`;
      } else {
        countQuery = sql`SELECT COUNT(*)::int as count FROM products`;
      }
      const countResult = await countQuery;
      totalCount = countResult[0]?.count || 0;
      totalPages = Math.ceil(totalCount / limit);
    } catch (error: any) {
      // If table doesn't exist, return empty
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          products: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        });
      }
      throw error;
    }

    let query;
    if (categoryId) {
      query = sql`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.created_at,
          p.updated_at,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ${parseInt(categoryId)}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (search) {
      query = sql`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.created_at,
          p.updated_at,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name ILIKE ${'%' + search + '%'}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (isActive !== null) {
      query = sql`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.created_at,
          p.updated_at,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = ${isActive === 'true'}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.created_at,
          p.updated_at,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const products = await query;

    return NextResponse.json({
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parseFloat(p.price.toString()),
        original_price: p.original_price ? parseFloat(p.original_price.toString()) : null,
        image_url: p.image_url,
        category_id: p.category_id,
        category_name: p.category_name,
        is_featured: p.is_featured || false,
        is_active: p.is_active !== false,
        stock: p.stock || 0,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get products error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách sản phẩm' },
      { status: 500 }
    );
  }
}

// POST: Tạo product mới
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // Kiểm tra slug trùng
    const existing = await sql`
      SELECT id FROM products WHERE slug = ${validatedData.slug}
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Slug đã tồn tại' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO products (
        name, slug, description, price, original_price, image_url,
        category_id, is_featured, is_active, stock
      )
      VALUES (
        ${validatedData.name},
        ${validatedData.slug},
        ${validatedData.description || null},
        ${validatedData.price},
        ${validatedData.original_price || null},
        ${validatedData.image_url || null},
        ${validatedData.category_id || null},
        ${validatedData.is_featured || false},
        ${validatedData.is_active !== false},
        ${validatedData.stock || 0}
      )
      RETURNING id, name, slug, description, price, original_price, image_url, category_id, is_featured, is_active, stock, created_at
    `;

    return NextResponse.json({
      message: 'Tạo sản phẩm thành công',
      product: result[0],
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

    if (process.env.NODE_ENV === 'development') {
      console.error('Create product error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi tạo sản phẩm' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật product
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    const { product_id, ...updateData } = validatedData;

    // Kiểm tra product có tồn tại không
    const products = await sql`
      SELECT id FROM products WHERE id = ${product_id}
    `;
    if (products.length === 0) {
      return NextResponse.json(
        { error: 'Sản phẩm không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra slug trùng (nếu có cập nhật slug)
    if (updateData.slug) {
      const existing = await sql`
        SELECT id FROM products WHERE slug = ${updateData.slug} AND id != ${product_id}
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Slug đã được sử dụng bởi sản phẩm khác' },
          { status: 400 }
        );
      }
    }

    // Cập nhật từng trường
    if (updateData.name !== undefined) {
      await sql`UPDATE products SET name = ${updateData.name}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.slug !== undefined) {
      await sql`UPDATE products SET slug = ${updateData.slug}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.description !== undefined) {
      await sql`UPDATE products SET description = ${updateData.description || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.price !== undefined) {
      await sql`UPDATE products SET price = ${updateData.price}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.original_price !== undefined) {
      await sql`UPDATE products SET original_price = ${updateData.original_price || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.image_url !== undefined) {
      // Chuyển chuỗi rỗng thành null
      const imageUrl = updateData.image_url === '' || updateData.image_url === null ? null : updateData.image_url;
      await sql`UPDATE products SET image_url = ${imageUrl}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.category_id !== undefined) {
      await sql`UPDATE products SET category_id = ${updateData.category_id}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.is_featured !== undefined) {
      await sql`UPDATE products SET is_featured = ${updateData.is_featured}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.is_active !== undefined) {
      await sql`UPDATE products SET is_active = ${updateData.is_active}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }
    if (updateData.stock !== undefined) {
      await sql`UPDATE products SET stock = ${updateData.stock}, updated_at = CURRENT_TIMESTAMP WHERE id = ${product_id}`;
    }

    // Lấy thông tin product sau khi cập nhật
    const result = await sql`
      SELECT 
        p.id, p.name, p.slug, p.description, p.price, p.original_price, p.image_url,
        p.category_id, p.is_featured, p.is_active, p.stock, p.updated_at,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${product_id}
    `;

    return NextResponse.json({
      message: 'Cập nhật sản phẩm thành công',
      product: {
        ...result[0],
        price: parseFloat(result[0].price.toString()),
        original_price: result[0].original_price ? parseFloat(result[0].original_price.toString()) : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

    if (process.env.NODE_ENV === 'development') {
      console.error('Update product error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật sản phẩm' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa product
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { error: 'Thiếu ID sản phẩm' },
        { status: 400 }
      );
    }

    const productIdNum = parseInt(productId);

    // Kiểm tra xem có đơn hàng nào chứa sản phẩm này không
    const orderItems = await sql`
      SELECT COUNT(*)::int as count FROM order_items WHERE product_id = ${productIdNum}
    `;
    if (orderItems[0]?.count > 0) {
      return NextResponse.json(
        { error: `Không thể xóa sản phẩm này vì có ${orderItems[0].count} đơn hàng chứa sản phẩm này` },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM products WHERE id = ${productIdNum} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Sản phẩm không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa sản phẩm' },
      { status: 500 }
    );
  }
}

