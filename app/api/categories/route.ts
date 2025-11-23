import { NextResponse } from 'next/server';
import { getCachedCategories } from '@/lib/cache';
import type { Category } from '@/lib/types';

export async function GET() {
  try {
    const categories = await getCachedCategories();

    return NextResponse.json({
      categories: categories as Category[],
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get categories error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh mục' },
      { status: 500 }
    );
  }
}

