import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin, verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { handleError, createError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const createTicketSchema = z.object({
  user_id: z.number().int().positive('ID người dùng không hợp lệ'),
  draw_date: z.string().datetime('Ngày mở thưởng không hợp lệ'),
  quantity: z.number().int().positive('Số lượng vé phải lớn hơn 0').max(100, 'Tối đa 100 vé mỗi lần').default(1),
});

// Hàm tạo mã vé 6 chữ số random
function generateTicketCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET: Lấy danh sách tất cả vé (admin)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      logger.warn('Unauthorized attempt to get tickets', { ip: request.ip });
      return handleError(createError.forbidden('Không có quyền truy cập'));
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;
    const userId = searchParams.get('user_id');

    if (page < 1 || limit < 1 || limit > 100) {
      return handleError(createError.validation('Tham số pagination không hợp lệ. Page >= 1, Limit 1-100'));
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

    let tickets: any[];
    let totalCount = 0;

    if (userId) {
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        return handleError(createError.validation('user_id không hợp lệ'));
      }

      tickets = await sql`
        SELECT 
          t.id,
          t.ticket_code,
          t.draw_date,
          t.created_at,
          t.status,
          t.user_id,
          u.name as user_name,
          u.email as user_email
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.user_id = ${userIdNum}
        ORDER BY t.draw_date ASC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*)::int as count
        FROM tickets
        WHERE user_id = ${userIdNum}
      `;
      totalCount = countResult[0]?.count || 0;
    } else {
      tickets = await sql`
        SELECT 
          t.id,
          t.ticket_code,
          t.draw_date,
          t.created_at,
          t.status,
          t.user_id,
          u.name as user_name,
          u.email as user_email
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.draw_date ASC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*)::int as count
        FROM tickets
      `;
      totalCount = countResult[0]?.count || 0;
    }

    return NextResponse.json({
      tickets: tickets.map((ticket: any) => ({
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        draw_date: ticket.draw_date,
        created_at: ticket.created_at,
        status: ticket.status || 'active',
        user_id: ticket.user_id,
        user_name: ticket.user_name,
        user_email: ticket.user_email,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error('Get tickets error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

// POST: Tạo vé cho user (admin)
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      logger.warn('Unauthorized attempt to create ticket', { ip: request.ip });
      return handleError(createError.forbidden('Không có quyền truy cập'));
    }

    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return handleError(createError.unauthorized('Chưa đăng nhập'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return handleError(createError.unauthorized('Token không hợp lệ'));
    }

    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

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

    // Kiểm tra user có tồn tại không
    const users = await sql`
      SELECT id, name, email FROM users WHERE id = ${validatedData.user_id}
    `;

    if (users.length === 0) {
      return handleError(createError.notFound('Người dùng không tồn tại'));
    }

    const createdTickets = [];
    const errors = [];

    // Tạo số lượng vé được yêu cầu
    for (let i = 0; i < validatedData.quantity; i++) {
      let attempts = 0;
      let ticketCode: string;
      let isUnique = false;

      // Đảm bảo mã vé là unique
      while (!isUnique && attempts < 10) {
        ticketCode = generateTicketCode();
        const existing = await sql`
          SELECT id FROM tickets WHERE ticket_code = ${ticketCode}
        `;
        if (existing.length === 0) {
          isUnique = true;
        } else {
          attempts++;
        }
      }

      if (!isUnique) {
        errors.push(`Không thể tạo mã vé unique sau ${attempts} lần thử`);
        continue;
      }

      try {
        const result = await sql`
          INSERT INTO tickets (user_id, ticket_code, draw_date, created_by, status)
          VALUES (${validatedData.user_id}, ${ticketCode}, ${validatedData.draw_date}, ${decoded.userId}, 'active')
          RETURNING id, ticket_code, draw_date, created_at
        `;

        createdTickets.push({
          id: result[0].id,
          ticket_code: result[0].ticket_code,
          draw_date: result[0].draw_date,
          created_at: result[0].created_at,
        });
      } catch (error: any) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          errors.push(`Mã vé ${ticketCode} đã tồn tại`);
        } else {
          errors.push(`Lỗi khi tạo vé: ${error.message}`);
        }
      }
    }

    if (createdTickets.length === 0) {
      return NextResponse.json(
        {
          error: 'Không thể tạo vé nào',
          details: errors,
        },
        { status: 400 }
      );
    }

    logger.info('Tickets created', { count: createdTickets.length, userId: validatedData.user_id, createdBy: decoded.userId });

    return NextResponse.json(
      {
        message: `Đã tạo ${createdTickets.length} vé thành công${errors.length > 0 ? ` (${errors.length} lỗi)` : ''}`,
        tickets: createdTickets,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create ticket error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

