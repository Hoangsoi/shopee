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
      categories: categories.map((cat: any) => {
        // Parse discount_percent đảm bảo luôn là số hợp lệ - parse nhiều cách để chắc chắn
        let discountPercent = 0
        if (cat.discount_percent !== null && cat.discount_percent !== undefined) {
          const value = cat.discount_percent
          if (typeof value === 'number') {
            discountPercent = Math.floor(value)
          } else if (typeof value === 'string') {
            const parsed = parseInt(value, 10)
            discountPercent = isNaN(parsed) ? 0 : parsed
          } else {
            const parsed = Number(value)
            discountPercent = isNaN(parsed) ? 0 : Math.floor(parsed)
          }
        }
        
        // Debug log cho VIP category
        if (cat.name === 'VIP') {
          console.log('API VIP Category Debug:', {
            name: cat.name,
            id: cat.id,
            raw_discount_percent: cat.discount_percent,
            parsed_discount_percent: discountPercent,
            type: typeof cat.discount_percent,
            value_type: typeof cat.discount_percent
          })
        }
        
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          discount_percent: discountPercent,
          icon: cat.icon,
          sort_order: cat.sort_order || 0,
        }
      }),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh mục' },
      { status: 500 }
    );
  }
}

