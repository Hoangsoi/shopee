import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })),
  payment_method: z.string().optional(),
  shipping_address: z.string().optional(),
  notes: z.string().optional(),
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

      // Tính commission cho từng đơn hàng đã xác nhận
      const ordersWithCommission = await Promise.all(
        orders.map(async (order: any) => {
          let commission = 0;
          
          // Chỉ tính commission cho đơn hàng đã xác nhận
          if (order.status === 'confirmed') {
            const orderItems = await sql`
              SELECT 
                oi.subtotal,
                p.category_id,
                c.discount_percent
              FROM order_items oi
              JOIN products p ON oi.product_id = p.id
              LEFT JOIN categories c ON p.category_id = c.id
              WHERE oi.order_id = ${order.id}
            `;
            
            // Tính tổng commission
            for (const item of orderItems) {
              const discountPercent = item.discount_percent || 0;
              const subtotal = parseFloat(item.subtotal.toString());
              commission += subtotal * (discountPercent / 100);
            }
          }
          
          return {
            id: order.id,
            order_number: order.order_number,
            total_amount: parseFloat(order.total_amount.toString()),
            status: order.status,
            payment_method: order.payment_method,
            shipping_address: order.shipping_address,
            notes: order.notes,
            item_count: parseInt(order.item_count.toString()),
            commission: commission,
            created_at: order.created_at,
            updated_at: order.updated_at,
          };
        })
      );

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
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách đơn hàng' },
      { status: 500 }
    );
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

    // Kiểm tra và tạo bảng orders nếu chưa có
    try {
      await sql`SELECT 1 FROM orders LIMIT 1`;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        await sql`
          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            order_number VARCHAR(50) UNIQUE NOT NULL,
            total_amount DECIMAL(15, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            payment_method VARCHAR(50),
            shipping_address TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
      }
    }

    // Kiểm tra và tạo bảng order_items nếu chưa có
    try {
      await sql`SELECT 1 FROM order_items LIMIT 1`;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        await sql`
          CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id),
            product_name VARCHAR(255) NOT NULL,
            product_price DECIMAL(10, 2) NOT NULL,
            quantity INTEGER NOT NULL,
            subtotal DECIMAL(15, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`;
      }
    }

    // Kiểm tra số dư ví và trạng thái đóng băng
    const users = await sql`
      SELECT wallet_balance, COALESCE(is_frozen, false) as is_frozen FROM users WHERE id = ${decoded.userId}
    `;
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }
    const walletBalance = users[0].wallet_balance ? parseFloat(users[0].wallet_balance.toString()) : 0;
    const isFrozen = users[0].is_frozen || false;

    // Kiểm tra tài khoản có bị đóng băng không
    if (isFrozen) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị đóng băng. Vui lòng liên hệ admin để được hỗ trợ.' },
        { status: 403 }
      );
    }

    // Lấy thông tin sản phẩm và tính tổng tiền
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of validatedData.items) {
      const products = await sql`
        SELECT 
          p.id, 
          p.name, 
          p.price, 
          p.stock,
          p.category_id,
          c.discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ${item.product_id} AND p.is_active = true
      `;

      if (products.length === 0) {
        return NextResponse.json(
          { error: `Sản phẩm ID ${item.product_id} không tồn tại` },
          { status: 400 }
        );
      }

      const product = products[0];

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Sản phẩm "${product.name}" không đủ số lượng` },
          { status: 400 }
        );
      }

      const price = parseFloat(product.price.toString());
      const subtotal = price * item.quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        product_id: product.id,
        product_name: product.name,
        product_price: price,
        quantity: item.quantity,
        subtotal,
        category_id: product.category_id,
        discount_percent: product.discount_percent || 0,
      });
    }

    // Kiểm tra số dư ví có đủ không
    if (walletBalance < totalAmount) {
      return NextResponse.json(
        { error: `Số dư ví không đủ. Số dư hiện tại: ${new Intl.NumberFormat('vi-VN').format(walletBalance)}đ, Cần: ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ` },
        { status: 400 }
      );
    }

    // Tạo order_number
    const orderNumber = `ORD-${Date.now()}-${decoded.userId}`;

    // Trừ tiền từ ví ngay lập tức
    await sql`
      UPDATE users 
      SET wallet_balance = wallet_balance - ${totalAmount}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${decoded.userId}
    `;

    // Tạo đơn hàng với status 'pending' (chờ admin phê duyệt)
    const orderResult = await sql`
      INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, shipping_address, notes)
      VALUES (${decoded.userId}, ${orderNumber}, ${totalAmount}, 'pending', ${validatedData.payment_method || null}, ${validatedData.shipping_address || null}, ${validatedData.notes || null})
      RETURNING id, order_number, total_amount, status, created_at
    `;

    const orderId = orderResult[0].id;

    // Thêm order_items
    for (const item of orderItemsData) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
        VALUES (${orderId}, ${item.product_id}, ${item.product_name}, ${item.product_price}, ${item.quantity}, ${item.subtotal})
      `;

      // Cập nhật stock
      await sql`
        UPDATE products 
        SET stock = stock - ${item.quantity}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.product_id}
      `;
    }

    // Xóa giỏ hàng sau khi tạo đơn hàng
    await sql`
      DELETE FROM cart_items WHERE user_id = ${decoded.userId}
    `;

    return NextResponse.json({
      message: 'Đặt hàng thành công. Đơn hàng đang chờ admin phê duyệt. Tiền đã được trừ từ ví.',
      order: {
        id: orderResult[0].id,
        order_number: orderResult[0].order_number,
        total_amount: parseFloat(orderResult[0].total_amount.toString()),
        status: orderResult[0].status,
        created_at: orderResult[0].created_at,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo đơn hàng' },
      { status: 500 }
    );
  }
}

