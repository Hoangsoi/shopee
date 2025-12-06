import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

// GET: Lấy danh sách vé của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Kiểm tra và tạo bảng tickets nếu chưa có
    try {
      await sql`SELECT 1 FROM tickets LIMIT 1`;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        await sql`
          CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ticket_code VARCHAR(6) NOT NULL UNIQUE,
            draw_date TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            status VARCHAR(20) DEFAULT 'active'
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_tickets_draw_date ON tickets(draw_date)`;
        logger.info('Created tickets table');
      }
    }

    // Lấy danh sách vé của user
    const tickets = await sql`
      SELECT 
        id,
        ticket_code,
        draw_date,
        created_at,
        status
      FROM tickets
      WHERE user_id = ${decoded.userId}
      ORDER BY draw_date ASC, created_at DESC
    `;

    return NextResponse.json({
      tickets: tickets.map((ticket: any) => ({
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        draw_date: ticket.draw_date,
        created_at: ticket.created_at,
        status: ticket.status || 'active',
      })),
    });
  } catch (error) {
    logger.error('Get tickets error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

