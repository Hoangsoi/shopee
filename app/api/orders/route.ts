import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { createPendingCashbackOrderFromItems } from '@/lib/pending-order-checkout';

const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive('ID sản phẩm phải là số nguyên dương'),
    quantity: z.number()
      .int('Số lượng phải là số nguyên')
      .positive('Số lượng phải lớn hơn 0')
      .max(1000, 'Số lượng không được vượt quá 1000'),
  })).min(1, 'Giỏ hàng không được trống'),
  payment_method: z.string().max(50, 'Phương thức thanh toán không được vượt quá 50 ký tự').optional(),
  shipping_address: z.string().max(500, 'Địa chỉ giao hàng không được vượt quá 500 ký tự').optional(),
  notes: z.string().max(1000, 'Ghi chú không được vượt quá 1000 ký tự').optional(),
});

// GET: Lấy danh sách đơn hàng của user
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

    // Kiểm tra xem bảng orders có tồn tại không
    try {
      const orders = await sql`
        SELECT 
          o.id,
          o.order_number,
          o.total_amount,
          o.status,
          o.payment_method,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ${decoded.userId}
        GROUP BY o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.shipping_address, o.notes, o.created_at, o.updated_at
        ORDER BY o.created_at DESC
      `;

      // Lấy commission từ database (đã được lưu khi phê duyệt)
      // Kiểm tra xem cột commission có tồn tại không
      let ordersWithCommission;
      try {
        const checkCommission = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'commission'
        `;
        
        if (checkCommission.length > 0) {
          // Cột commission đã tồn tại, lấy từ database
          const ordersWithCommissionData = await sql`
            SELECT 
              o.id,
              o.order_number,
              o.total_amount,
              o.status,
              o.payment_method,
              o.shipping_address,
              o.notes,
              o.commission,
              o.created_at,
              o.updated_at,
              COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ${decoded.userId}
            GROUP BY o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.shipping_address, o.notes, o.commission, o.created_at, o.updated_at
            ORDER BY o.created_at DESC
          `;
          
          ordersWithCommission = ordersWithCommissionData.map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: parseFloat(order.total_amount.toString()),
            status: order.status,
            payment_method: order.payment_method,
            shipping_address: order.shipping_address,
            notes: order.notes,
            item_count: parseInt(order.item_count.toString()),
            commission: order.commission ? parseFloat(order.commission.toString()) : 0,
            created_at: order.created_at,
            updated_at: order.updated_at,
          }));
        } else {
          // Cột commission chưa tồn tại, tính lại (fallback)
          const orderIds = orders.map((o: any) => o.id);
          let commissionsMap: Record<number, number> = {};
          
          if (orderIds.length > 0) {
            // Tính commission cho từng order riêng lẻ để tránh lỗi TypeScript với array
            for (const orderId of orderIds) {
              const commissionData = await sql`
                SELECT 
                  oi.order_id,
                  SUM(oi.subtotal * COALESCE(c.discount_percent, 0) / 100.0) as total_commission
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE oi.order_id = ${orderId} AND o.status = 'confirmed'
                GROUP BY oi.order_id
              `;
              
              if (commissionData.length > 0) {
                commissionsMap[orderId] = parseFloat(commissionData[0].total_commission?.toString() || '0');
              }
            }
          }
          
          ordersWithCommission = orders.map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: parseFloat(order.total_amount.toString()),
            status: order.status,
            payment_method: order.payment_method,
            shipping_address: order.shipping_address,
            notes: order.notes,
            item_count: parseInt(order.item_count.toString()),
            commission: commissionsMap[order.id] || 0,
            created_at: order.created_at,
            updated_at: order.updated_at,
          }));
        }
      } catch (error) {
        // Fallback: tính commission như cũ
        const orderIds = orders.map((o: any) => o.id);
        let commissionsMap: Record<number, number> = {};
        
        if (orderIds.length > 0) {
          // Tính commission cho từng order riêng lẻ để tránh lỗi TypeScript với array
          for (const orderId of orderIds) {
            const commissionData = await sql`
              SELECT 
                oi.order_id,
                SUM(oi.subtotal * COALESCE(c.discount_percent, 0) / 100.0) as total_commission
              FROM order_items oi
              JOIN orders o ON oi.order_id = o.id
              JOIN products p ON oi.product_id = p.id
              LEFT JOIN categories c ON p.category_id = c.id
              WHERE oi.order_id = ${orderId} AND o.status = 'confirmed'
              GROUP BY oi.order_id
            `;
            
            if (commissionData.length > 0) {
              commissionsMap[orderId] = parseFloat(commissionData[0].total_commission?.toString() || '0');
            }
          }
        }
        
        ordersWithCommission = orders.map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          total_amount: parseFloat(order.total_amount.toString()),
          status: order.status,
          payment_method: order.payment_method,
          shipping_address: order.shipping_address,
          notes: order.notes,
          item_count: parseInt(order.item_count.toString()),
          commission: commissionsMap[order.id] || 0,
          created_at: order.created_at,
          updated_at: order.updated_at,
        }));
      }

      return NextResponse.json({
        orders: ordersWithCommission,
      });
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, trả về mảng rỗng
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          orders: [],
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Get orders error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

// POST: Tạo đơn hàng mới từ giỏ hàng
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    if (validatedData.items.length === 0) {
      return NextResponse.json(
        { error: 'Giỏ hàng trống' },
        { status: 400 }
      );
    }

    const orderNumber = `ORD-${Date.now()}-${decoded.userId}`;
    const result = await createPendingCashbackOrderFromItems(decoded.userId, validatedData.items, {
      payment_method: validatedData.payment_method || null,
      shipping_address: validatedData.shipping_address || null,
      notes: validatedData.notes || null,
      clearCart: true,
      orderNumber,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    return NextResponse.json({
      message: 'Đặt hàng thành công. Đơn hàng đang chờ admin phê duyệt. Tiền đã được trừ từ ví.',
      order: result.order,
    }, { status: 201 });
  } catch (error) {
    logger.error('Create order error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

