import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { unstable_cache } from 'next/cache';

// Helper function để fetch banners với cache
async function fetchBanners() {
  return await sql`
    SELECT id, image_url, title, link_url, is_active, sort_order
    FROM banners
    WHERE is_active = true
    ORDER BY sort_order ASC, created_at ASC
  `;
}

// Cached version - cache 5 phút
const getCachedBanners = unstable_cache(
  fetchBanners,
  ['banners'],
  {
    revalidate: 300, // 5 minutes
    tags: ['banners'],
  }
);

// GET: Lấy danh sách banners (public)
export async function GET() {
  try {
    const banners = await getCachedBanners();

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

