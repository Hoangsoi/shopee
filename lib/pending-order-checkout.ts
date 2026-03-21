import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export type CheckoutLineInput = { product_id: number; quantity: number };

type OrderItemRow = {
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
};

export type PendingOrderSuccess = {
  ok: true;
  order: {
    id: number;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: unknown;
  };
};

export type PendingOrderFailure = {
  ok: false;
  statusCode: number;
  error: string;
};

export async function ensureOrdersAndOrderItemsTables(): Promise<void> {
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
}

/**
 * Tạo đơn pending (cashback): trừ ví, trừ kho, ghi order_items. clearCart = true khi đặt từ giỏ.
 */
export async function createPendingCashbackOrderFromItems(
  userId: number,
  items: CheckoutLineInput[],
  options: {
    payment_method?: string | null;
    shipping_address?: string | null;
    notes?: string | null;
    clearCart: boolean;
    orderNumber: string;
  }
): Promise<PendingOrderSuccess | PendingOrderFailure> {
  if (items.length === 0) {
    return { ok: false, statusCode: 400, error: 'Danh sách sản phẩm trống' };
  }

  await ensureOrdersAndOrderItemsTables();

  const users = await sql`
    SELECT wallet_balance, COALESCE(is_frozen, false) as is_frozen FROM users WHERE id = ${userId}
  `;
  if (users.length === 0) {
    return { ok: false, statusCode: 404, error: 'User không tồn tại' };
  }
  const walletBalance = users[0].wallet_balance ? parseFloat(users[0].wallet_balance.toString()) : 0;
  const isFrozen = users[0].is_frozen || false;

  if (isFrozen) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Tài khoản của bạn đã bị đóng băng. Vui lòng liên hệ admin để được hỗ trợ.',
    };
  }

  let totalAmount = 0;
  const orderItemsData: OrderItemRow[] = [];

  for (const item of items) {
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
      return {
        ok: false,
        statusCode: 400,
        error: `Sản phẩm ID ${item.product_id} không tồn tại hoặc đã bị vô hiệu hóa`,
      };
    }

    const product = products[0];
    const currentStock = product.stock ? parseInt(product.stock.toString()) : 0;
    if (currentStock < item.quantity) {
      return {
        ok: false,
        statusCode: 400,
        error: `Sản phẩm "${product.name}" không đủ số lượng. Số lượng còn lại: ${currentStock}`,
      };
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
    });
  }

  if (walletBalance < totalAmount) {
    return {
      ok: false,
      statusCode: 400,
      error: `Số dư ví không đủ. Số dư hiện tại: ${new Intl.NumberFormat('vi-VN').format(walletBalance)}đ, Cần: ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ`,
    };
  }

  const orderNumber = options.orderNumber;
  let orderResult: any[] = [];
  let orderId: number | null = null;

  try {
    const updateBalanceResult = await sql`
      UPDATE users 
      SET wallet_balance = wallet_balance - ${totalAmount}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId} AND wallet_balance >= ${totalAmount}
      RETURNING wallet_balance
    `;

    if (updateBalanceResult.length === 0) {
      return {
        ok: false,
        statusCode: 400,
        error: `Số dư ví không đủ. Số dư hiện tại: ${new Intl.NumberFormat('vi-VN').format(walletBalance)}đ, Cần: ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ`,
      };
    }

    orderResult = await sql`
      INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, shipping_address, notes)
      VALUES (${userId}, ${orderNumber}, ${totalAmount}, 'pending', ${options.payment_method || null}, ${options.shipping_address || null}, ${options.notes || null})
      RETURNING id, order_number, total_amount, status, created_at
    `;

    if (orderResult.length === 0) {
      await sql`
        UPDATE users 
        SET wallet_balance = wallet_balance + ${totalAmount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;
      return { ok: false, statusCode: 500, error: 'Lỗi khi tạo đơn hàng. Tiền đã được hoàn lại.' };
    }

    orderId = orderResult[0].id;

    for (const row of orderItemsData) {
      const updateResult = await sql`
        UPDATE products 
        SET stock = stock - ${row.quantity}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${row.product_id} AND stock >= ${row.quantity}
        RETURNING id, stock, name
      `;

      if (updateResult.length === 0) {
        try {
          if (orderId) {
            await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;
            await sql`DELETE FROM orders WHERE id = ${orderId}`;
          }
          await sql`
            UPDATE users 
            SET wallet_balance = wallet_balance + ${totalAmount}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userId}
          `;
        } catch (rollbackError) {
          logger.error(
            'Rollback checkout',
            rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError))
          );
        }

        return {
          ok: false,
          statusCode: 400,
          error: `Sản phẩm "${row.product_name}" không đủ số lượng. Có thể đã được người khác mua trước đó.`,
        };
      }

      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
        VALUES (${orderId}, ${row.product_id}, ${row.product_name}, ${row.product_price}, ${row.quantity}, ${row.subtotal})
      `;
    }
  } catch (error) {
    try {
      if (orderId) {
        await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;
        await sql`DELETE FROM orders WHERE id = ${orderId}`;
      } else {
        const existingOrder = await sql`SELECT id FROM orders WHERE order_number = ${orderNumber}`;
        if (existingOrder.length > 0) {
          const existingOrderId = existingOrder[0].id;
          await sql`DELETE FROM order_items WHERE order_id = ${existingOrderId}`;
          await sql`DELETE FROM orders WHERE id = ${existingOrderId}`;
        }
      }
      await sql`
        UPDATE users 
        SET wallet_balance = wallet_balance + ${totalAmount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;
    } catch (rollbackError) {
      logger.error(
        'Rollback checkout',
        rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError))
      );
    }

    logger.error('createPendingCashbackOrderFromItems', error instanceof Error ? error : new Error(String(error)));
    return { ok: false, statusCode: 500, error: 'Lỗi khi tạo đơn hàng. Tiền đã được hoàn lại.' };
  }

  if (options.clearCart) {
    try {
      await sql`DELETE FROM cart_items WHERE user_id = ${userId}`;
    } catch {
      /* giỏ có thể chưa có bảng */
    }
  }

  return {
    ok: true,
    order: {
      id: orderResult[0].id,
      order_number: orderResult[0].order_number,
      total_amount: parseFloat(orderResult[0].total_amount.toString()),
      status: orderResult[0].status,
      created_at: orderResult[0].created_at,
    },
  };
}
