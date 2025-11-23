import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import type { Product } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');
    const featured = searchParams.get('featured');

    let query;
    if (categoryId) {
      query = sql`
        SELECT p.*, c.name as category_name, c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ${categoryId} AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 100
      `;
    } else if (featured === 'true') {
      query = sql`
        SELECT p.*, c.name as category_name, c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_featured = true AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    } else {
      query = sql`
        SELECT p.*, c.name as category_name, c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    }

    const products = await query;

    return NextResponse.json({
      products: products.map((product): Product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: parseFloat(product.price.toString()),
        original_price: product.original_price ? parseFloat(product.original_price.toString()) : null,
        image_url: product.image_url,
        category_id: product.category_id,
        category_name: product.category_name,
        discount_percent: product.category_discount_percent ? parseInt(product.category_discount_percent.toString()) : 0,
        is_featured: product.is_featured,
        is_active: product.is_active,
        stock: product.stock ? parseInt(product.stock.toString()) : 0,
        created_at: product.created_at,
        updated_at: product.updated_at,
      })),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get products error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy sản phẩm' },
      { status: 500 }
    );
  }
}

