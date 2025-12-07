import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

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
    // Note: Neon SQL serverless không hỗ trợ FOR UPDATE tốt, nên dùng atomic UPDATE với điều kiện
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of validatedData.items) {
      // Lấy thông tin sản phẩm (không dùng FOR UPDATE vì Neon serverless không hỗ trợ tốt)
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
          { error: `Sản phẩm ID ${item.product_id} không tồn tại hoặc đã bị vô hiệu hóa` },
          { status: 400 }
        );
      }

      const product = products[0];

      // Kiểm tra stock
      const currentStock = product.stock ? parseInt(product.stock.toString()) : 0;
      if (currentStock < item.quantity) {
        return NextResponse.json(
          { error: `Sản phẩm "${product.name}" không đủ số lượng. Số lượng còn lại: ${currentStock}` },
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

    // Biến để lưu kết quả order (cần dùng bên ngoài try block)
    let orderResult: any[] = [];
    let orderId: number | null = null;

    // Thực hiện các bước tạo đơn hàng (không dùng transaction wrapper vì Neon serverless không hỗ trợ)
    // Sử dụng atomic operations và manual rollback nếu cần
    // BUSINESS LOGIC: Mô hình Cashback - Tiền sẽ được hoàn lại khi admin phê duyệt đơn hàng
    try {
      // Bước 1: Trừ tiền từ ví (atomic với điều kiện)
      // Note: Tiền này sẽ được hoàn lại khi admin phê duyệt đơn hàng (xem app/api/admin/orders/route.ts)
      const updateBalanceResult = await sql`
        UPDATE users 
        SET wallet_balance = wallet_balance - ${totalAmount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${decoded.userId} AND wallet_balance >= ${totalAmount}
        RETURNING wallet_balance
      `;

      // Kiểm tra xem có trừ tiền thành công không
      if (updateBalanceResult.length === 0) {
        // Không trừ được tiền (số dư không đủ)
        return NextResponse.json(
          { error: `Số dư ví không đủ. Số dư hiện tại: ${new Intl.NumberFormat('vi-VN').format(walletBalance)}đ, Cần: ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ` },
          { status: 400 }
        );
      }

      // Bước 2: Tạo đơn hàng
      orderResult = await sql`
        INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, shipping_address, notes)
        VALUES (${decoded.userId}, ${orderNumber}, ${totalAmount}, 'pending', ${validatedData.payment_method || null}, ${validatedData.shipping_address || null}, ${validatedData.notes || null})
        RETURNING id, order_number, total_amount, status, created_at
      `;

      if (orderResult.length === 0) {
        // Không tạo được order - hoàn lại tiền
        await sql`
          UPDATE users 
          SET wallet_balance = wallet_balance + ${totalAmount}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${decoded.userId}
        `;
        return NextResponse.json(
          { error: 'Lỗi khi tạo đơn hàng. Tiền đã được hoàn lại.' },
          { status: 500 }
        );
      }

      orderId = orderResult[0].id;

      // Bước 3: Thêm order_items và cập nhật stock (atomic với điều kiện)
      for (const item of orderItemsData) {
        // Cập nhật stock với điều kiện stock >= quantity để tránh stock âm (atomic operation)
        const updateResult = await sql`
          UPDATE products 
          SET stock = stock - ${item.quantity}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${item.product_id} AND stock >= ${item.quantity}
          RETURNING id, stock, name
        `;

        // Kiểm tra xem có cập nhật thành công không
        if (updateResult.length === 0) {
          // Stock không đủ - rollback: hoàn lại tiền, xóa order_items và xóa order
          try {
            if (orderId) {
              await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;
              await sql`DELETE FROM orders WHERE id = ${orderId}`;
            }
            await sql`
              UPDATE users 
              SET wallet_balance = wallet_balance + ${totalAmount}, updated_at = CURRENT_TIMESTAMP
              WHERE id = ${decoded.userId}
            `;
          } catch (rollbackError) {
            logger.error('Error during rollback:', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)));
          }
          
          return NextResponse.json(
            { error: `Sản phẩm "${item.product_name}" không đủ số lượng. Có thể đã được người khác mua trước đó.` },
            { status: 400 }
          );
        }

        // Thêm order_item sau khi đã cập nhật stock thành công
        await sql`
          INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
          VALUES (${orderId}, ${item.product_id}, ${item.product_name}, ${item.product_price}, ${item.quantity}, ${item.subtotal})
        `;
      }
    } catch (error) {
      // Nếu có lỗi, rollback: hoàn lại tiền, xóa order_items và xóa order (nếu đã tạo)
      try {
        if (orderId) {
          await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;
          await sql`DELETE FROM orders WHERE id = ${orderId}`;
        } else {
          // Kiểm tra xem order đã được tạo chưa bằng order_number
          const existingOrder = await sql`SELECT id FROM orders WHERE order_number = ${orderNumber}`;
          if (existingOrder.length > 0) {
            const existingOrderId = existingOrder[0].id;
            await sql`DELETE FROM order_items WHERE order_id = ${existingOrderId}`;
            await sql`DELETE FROM orders WHERE id = ${existingOrderId}`;
          }
        }
        // Hoàn lại tiền
        await sql`
          UPDATE users 
          SET wallet_balance = wallet_balance + ${totalAmount}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${decoded.userId}
        `;
      } catch (rollbackError) {
        logger.error('Error during rollback:', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)));
      }
      
      logger.error('Create order error:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: 'Lỗi khi tạo đơn hàng. Tiền đã được hoàn lại.' },
        { status: 500 }
      );
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
    logger.error('Create order error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

