import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET: Lấy chi tiết đơn hàng
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
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

    const orderId = parseInt(params.orderId);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Order ID không hợp lệ' },
        { status: 400 }
      );
    }

    // Lấy thông tin đơn hàng
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
        o.updated_at
      FROM orders o
      WHERE o.id = ${orderId} AND o.user_id = ${decoded.userId}
    `;

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Đơn hàng không tồn tại' },
        { status: 404 }
      );
    }

    // Lấy chi tiết đơn hàng
    const orderItems = await sql`
      SELECT 
        oi.id,
        oi.product_id,
        oi.product_name,
        oi.product_price,
        oi.quantity,
        oi.subtotal,
        p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ${orderId}
      ORDER BY oi.id
    `;

    const order = orders[0];

    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: parseFloat(order.total_amount.toString()),
        status: order.status,
        payment_method: order.payment_method,
        shipping_address: order.shipping_address,
        notes: order.notes,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: orderItems.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: parseFloat(item.product_price.toString()),
          quantity: item.quantity,
          subtotal: parseFloat(item.subtotal.toString()),
          image_url: item.image_url,
        })),
      },
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy chi tiết đơn hàng' },
      { status: 500 }
    );
  }
}

