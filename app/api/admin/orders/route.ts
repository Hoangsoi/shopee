import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const updateOrderStatusSchema = z.object({
  order_id: z.number().int().positive('ID đơn hàng không hợp lệ'),
  status: z.enum(['confirmed', 'cancelled'], {
    errorMap: () => ({ message: 'Status phải là confirmed hoặc cancelled' }),
  }),
  rejection_reason: z.string().max(500, 'Lý do từ chối không được vượt quá 500 ký tự').optional(),
});

// Admin check is now handled by lib/auth.ts isAdmin() function

// GET: Lấy tất cả đơn hàng (chỉ admin) với pagination
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Tham số pagination không hợp lệ. Page >= 1, Limit 1-100' },
        { status: 400 }
      );
    } // Filter by status if provided

    try {
      // Get total count
      let totalCount = 0;
      if (status) {
        const countResult = await sql`
          SELECT COUNT(*)::int as count
          FROM orders
          WHERE status = ${status}
        `;
        totalCount = countResult[0]?.count || 0;
      } else {
        const countResult = await sql`SELECT COUNT(*)::int as count FROM orders`;
        totalCount = countResult[0]?.count || 0;
      }

      let query;
      if (status) {
        query = sql`
          SELECT 
            o.id,
            o.order_number,
            o.user_id,
            o.total_amount,
            o.status,
            o.payment_method,
            o.shipping_address,
            o.notes,
            o.created_at,
            o.updated_at,
            u.name as user_name,
            u.email as user_email,
            COALESCE(COUNT(oi.id), 0)::int as item_count
          FROM orders o
          JOIN users u ON o.user_id = u.id
          LEFT JOIN order_items oi ON o.id = oi.order_id
          WHERE o.status = ${status}
          GROUP BY o.id, o.order_number, o.user_id, o.total_amount, o.status, o.payment_method, o.shipping_address, o.notes, o.created_at, o.updated_at, u.name, u.email
          ORDER BY o.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        query = sql`
          SELECT 
            o.id,
            o.order_number,
            o.user_id,
            o.total_amount,
            o.status,
            o.payment_method,
            o.shipping_address,
            o.notes,
            o.created_at,
            o.updated_at,
            u.name as user_name,
            u.email as user_email,
            COALESCE(COUNT(oi.id), 0)::int as item_count
          FROM orders o
          JOIN users u ON o.user_id = u.id
          LEFT JOIN order_items oi ON o.id = oi.order_id
          GROUP BY o.id, o.order_number, o.user_id, o.total_amount, o.status, o.payment_method, o.shipping_address, o.notes, o.created_at, o.updated_at, u.name, u.email
          ORDER BY o.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const orders = await query;

      return NextResponse.json({
        orders: orders.map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          user_id: order.user_id,
          user_name: order.user_name,
          user_email: order.user_email,
          total_amount: parseFloat(order.total_amount.toString()),
          status: order.status,
          payment_method: order.payment_method,
          shipping_address: order.shipping_address,
          notes: order.notes,
          item_count: parseInt(order.item_count?.toString() || '0'),
          created_at: order.created_at,
          updated_at: order.updated_at,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (dbError: any) {
      // Nếu bảng chưa tồn tại, trả về mảng rỗng
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
        console.log('Orders table does not exist yet');
        return NextResponse.json({
          orders: [],
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    logger.error('Get all orders error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

// PUT: Phê duyệt hoặc từ chối đơn hàng (chỉ admin)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateOrderStatusSchema.parse(body);

    const { order_id, status, rejection_reason } = validatedData;

    // Lấy thông tin đơn hàng
    const orders = await sql`
      SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.status
      FROM orders o
      WHERE o.id = ${order_id}
    `;

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Đơn hàng không tồn tại' },
        { status: 404 }
      );
    }

    const order = orders[0];

    // Chỉ có thể phê duyệt/từ chối đơn hàng đang ở trạng thái pending
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Đơn hàng đã được xử lý. Trạng thái hiện tại: ${order.status}` },
        { status: 400 }
      );
    }

    // Lấy chi tiết đơn hàng để tính hoa hồng
    const orderItems = await sql`
      SELECT 
        oi.product_id,
        oi.product_price,
        oi.quantity,
        oi.subtotal,
        p.category_id,
        c.discount_percent
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE oi.order_id = ${order_id}
    `;

    const totalAmount = parseFloat(order.total_amount.toString());
    let totalCommission = 0;

    // Tính hoa hồng dựa trên discount_percent của từng category
    for (const item of orderItems) {
      const discountPercent = item.discount_percent || 0;
      const subtotal = parseFloat(item.subtotal.toString());
      // Hoa hồng = subtotal * (discount_percent / 100)
      const commission = subtotal * (discountPercent / 100);
      totalCommission += commission;
    }

    // Đảm bảo cột commission tồn tại trong bảng orders
    try {
      const checkCommission = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'commission'
      `;
      if (checkCommission.length === 0) {
        await sql`ALTER TABLE orders ADD COLUMN commission DECIMAL(15, 2) DEFAULT 0`;
      }
    } catch (error) {
      // Column may already exist or table doesn't exist yet
      if (process.env.NODE_ENV === 'development') {
        console.log('Commission column check:', error);
      }
    }

    // Cập nhật trạng thái đơn hàng, commission và lý do từ chối (nếu có)
    const rejectionNote = status === 'cancelled' && rejection_reason 
      ? rejection_reason 
      : status === 'cancelled' 
      ? 'Hết hàng' // Lý do mặc định
      : null;
    
    await sql`
      UPDATE orders
      SET 
        status = ${status}, 
        commission = ${status === 'confirmed' ? totalCommission : 0},
        notes = ${rejectionNote || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${order_id}
    `;

    // Xử lý hoàn tiền và hoa hồng
    // BUSINESS LOGIC: Mô hình Cashback - User mua hàng và được hoàn lại tiền + hoa hồng
    // - Khi tạo đơn hàng: Tiền đã được trừ từ ví (xem app/api/orders/route.ts)
    // - Khi admin phê duyệt: Hoàn lại tiền gốc + hoa hồng (user mua hàng miễn phí + được hoa hồng)
    // - Khi admin từ chối: Chỉ hoàn lại tiền gốc, không có hoa hồng
    if (status === 'confirmed') {
      // Phê duyệt: Hoàn lại tiền gốc + hoa hồng (Cashback model)
      await sql`
        UPDATE users
        SET 
          wallet_balance = wallet_balance + ${totalAmount} + ${totalCommission},
          commission = commission + ${totalCommission},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${order.user_id}
      `;
    } else if (status === 'cancelled') {
      // Từ chối: Chỉ hoàn lại tiền gốc, không có hoa hồng
      await sql`
        UPDATE users
        SET 
          wallet_balance = wallet_balance + ${totalAmount},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${order.user_id}
      `;

      // Hoàn lại stock cho các sản phẩm
      for (const item of orderItems) {
        await sql`
          UPDATE products
          SET stock = stock + ${item.quantity}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${item.product_id}
        `;
      }
    }

    return NextResponse.json({
      message: status === 'confirmed' 
        ? `Đơn hàng đã được phê duyệt. Đã hoàn lại ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ và hoa hồng ${new Intl.NumberFormat('vi-VN').format(totalCommission)}đ`
        : `Đơn hàng đã bị từ chối. Đã hoàn lại ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ`,
      order: {
        id: order.id,
        status: status,
        total_amount: totalAmount,
        commission: status === 'confirmed' ? totalCommission : 0,
      },
    });
  } catch (error) {
    logger.error('Update order status error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

