import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const categories = await sql`
      SELECT id, name, slug, discount_percent, icon, sort_order
      FROM categories
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;

    return NextResponse.json({
      categories: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh mục' },
      { status: 500 }
    );
  }
}

