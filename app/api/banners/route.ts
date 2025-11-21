import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Lấy danh sách banners (public)
export async function GET() {
  try {
    const banners = await sql`
      SELECT id, image_url, title, link_url, is_active, sort_order
      FROM banners
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;

    return NextResponse.json({
      banners: banners.map((banner: any) => ({
        id: banner.id,
        image_url: banner.image_url,
        title: banner.title || '',
        link_url: banner.link_url || null,
      })),
    });
  } catch (error: any) {
    // Nếu bảng chưa tồn tại, trả về mảng rỗng
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({
        banners: [],
      });
    }
    console.error('Get banners error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách banner' },
      { status: 500 }
    );
  }
}

