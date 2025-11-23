import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const notificationSchema = z.object({
  content: z.string().min(1, 'Nội dung không được để trống'),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const updateNotificationSchema = z.object({
  notification_id: z.number().int().positive('ID thông báo không hợp lệ'),
  content: z.string().min(1, 'Nội dung không được để trống').optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy danh sách notifications (chỉ admin)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    try {
      const notifications = await sql`
        SELECT id, content, is_active, sort_order, created_at, updated_at
        FROM notifications
        ORDER BY sort_order ASC, created_at ASC
      `;

      return NextResponse.json({
        notifications: notifications.map((notif: any) => ({
          id: notif.id,
          content: notif.content,
          is_active: notif.is_active,
          sort_order: notif.sort_order,
          created_at: notif.created_at,
          updated_at: notif.updated_at,
        })),
      });
    } catch (dbError: any) {
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
        return NextResponse.json({
          notifications: [],
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách thông báo' },
      { status: 500 }
    );
  }
}

// POST: Tạo notification mới (chỉ admin)
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = notificationSchema.parse(body);

    const result = await sql`
      INSERT INTO notifications (content, is_active, sort_order)
      VALUES (${validatedData.content}, ${validatedData.is_active ?? true}, ${validatedData.sort_order ?? 0})
      RETURNING id, content, is_active, sort_order, created_at, updated_at
    `;

    return NextResponse.json({
      message: 'Thêm thông báo thành công',
      notification: {
        id: result[0].id,
        content: result[0].content,
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

    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo thông báo' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật notification (chỉ admin)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateNotificationSchema.parse(body);

    const { notification_id, ...updateData } = validatedData;

    // Cập nhật từng trường
    if (updateData.content !== undefined) {
      await sql`UPDATE notifications SET content = ${updateData.content}, updated_at = CURRENT_TIMESTAMP WHERE id = ${notification_id}`;
    }
    if (updateData.is_active !== undefined) {
      await sql`UPDATE notifications SET is_active = ${updateData.is_active}, updated_at = CURRENT_TIMESTAMP WHERE id = ${notification_id}`;
    }
    if (updateData.sort_order !== undefined) {
      await sql`UPDATE notifications SET sort_order = ${updateData.sort_order}, updated_at = CURRENT_TIMESTAMP WHERE id = ${notification_id}`;
    }

    const result = await sql`
      SELECT id, content, is_active, sort_order, created_at, updated_at
      FROM notifications
      WHERE id = ${notification_id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Thông báo không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Cập nhật thông báo thành công',
      notification: {
        id: result[0].id,
        content: result[0].content,
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

    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật thông báo' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa notification (chỉ admin)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Thiếu ID thông báo' },
        { status: 400 }
      );
    }

    const notificationIdNum = parseInt(notificationId);

    const result = await sql`
      DELETE FROM notifications WHERE id = ${notificationIdNum} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Thông báo không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Xóa thông báo thành công',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa thông báo' },
      { status: 500 }
    );
  }
}

