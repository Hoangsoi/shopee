import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

import sql from '@/lib/db'
import { getPublicCacheHeaders } from '@/lib/http-cache'

const getCachedNotifications = unstable_cache(
  async () => {
    return sql`
      SELECT id, content, is_active, sort_order
      FROM notifications
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `
  },
  ['notifications'],
  {
    revalidate: 300,
    tags: ['notifications'],
  }
)

export async function GET() {
  try {
    const notifications = await getCachedNotifications()

    return NextResponse.json(
      {
        notifications: notifications.map((notif: any) => ({
          id: notif.id,
          content: notif.content,
        })),
      },
      {
        headers: getPublicCacheHeaders(300, 600),
      }
    )
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({
        notifications: [],
      })
    }

    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách thông báo' },
      { status: 500 }
    )
  }
}
