import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Lấy danh sách notifications (public)
export async function GET() {
  try {
    const notifications = await sql`
      SELECT id, content, is_active, sort_order
      FROM notifications
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;

    return NextResponse.json({
      notifications: notifications.map((notif: any) => ({
        id: notif.id,
        content: notif.content,
      })),
    });
  } catch (error: any) {
    // Nếu bảng chưa tồn tại, trả về mảng rỗng
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({
        notifications: [],
      });
    }
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách thông báo' },
      { status: 500 }
    );
  }
}

