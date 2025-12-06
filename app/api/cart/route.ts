import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const addToCartSchema = z.object({
  product_id: z.number().int().positive('ID sản phẩm phải là số nguyên dương'),
  quantity: z.number()
    .int('Số lượng phải là số nguyên')
    .positive('Số lượng phải lớn hơn 0')
    .max(1000, 'Số lượng không được vượt quá 1000')
    .default(1),
});

// GET: Lấy giỏ hàng của user hiện tại
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

    // Kiểm tra xem bảng cart_items có tồn tại không
    try {
      // Lấy pagination params (optional, mặc định không giới hạn)
      const { searchParams } = new URL(request.url);
      const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : null;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : null;
      
      let offset: number | null = null;
      if (page !== null && limit !== null) {
        offset = (page - 1) * limit;
        // Validate pagination
        if (page < 1 || limit < 1 || limit > 100) {
          return NextResponse.json(
            { error: 'Tham số pagination không hợp lệ. Page >= 1, Limit 1-100' },
            { status: 400 }
          );
        }
      }

      // Query với hoặc không có pagination
      let cartItems;
      if (page !== null && limit !== null && offset !== null) {
        cartItems = await sql`
          SELECT 
            ci.id,
            ci.product_id,
            ci.quantity,
            p.name,
            p.price,
            p.original_price,
            p.image_url,
            p.stock,
            c.name as category_name,
            c.discount_percent
          FROM cart_items ci
          INNER JOIN products p ON ci.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE ci.user_id = ${decoded.userId} AND p.is_active = true
          ORDER BY ci.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        cartItems = await sql`
          SELECT 
            ci.id,
            ci.product_id,
            ci.quantity,
            p.name,
            p.price,
            p.original_price,
            p.image_url,
            p.stock,
            c.name as category_name,
            c.discount_percent
          FROM cart_items ci
          INNER JOIN products p ON ci.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE ci.user_id = ${decoded.userId} AND p.is_active = true
          ORDER BY ci.created_at DESC
        `;
      }

      // Tính tổng tiền
      let total = 0;
      const items = cartItems.map((item: any) => {
        const itemTotal = parseFloat(item.price.toString()) * item.quantity;
        total += itemTotal;
        return {
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          name: item.name,
          price: parseFloat(item.price.toString()),
          original_price: item.original_price ? parseFloat(item.original_price.toString()) : null,
          image_url: item.image_url,
          stock: item.stock,
          category_name: item.category_name,
          discount_percent: item.discount_percent || 0,
          subtotal: itemTotal,
        };
      });

      // Tính tổng số lượng sản phẩm (tổng quantity của tất cả items)
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Lấy tổng số items nếu có pagination
      let pagination = undefined;
      if (page !== null && limit !== null) {
        const countResult = await sql`
          SELECT COUNT(*)::int as count
          FROM cart_items ci
          INNER JOIN products p ON ci.product_id = p.id
          WHERE ci.user_id = ${decoded.userId} AND p.is_active = true
        `;
        const totalCount = countResult[0]?.count || 0;
        pagination = {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        };
      }

      return NextResponse.json({
        items,
        total,
        count: items.length, // Số loại sản phẩm trong trang hiện tại
        totalQuantity, // Tổng số lượng sản phẩm trong trang hiện tại
        ...(pagination ? { pagination } : {}),
      });
    } catch (error: any) {
      // Nếu bảng chưa tồn tại, trả về giỏ hàng rỗng
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          items: [],
          total: 0,
          count: 0,
          totalQuantity: 0,
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Get cart error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

// POST: Thêm sản phẩm vào giỏ hàng
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
    const validatedData = addToCartSchema.parse(body);

    // Kiểm tra sản phẩm có tồn tại và còn hàng không
    const products = await sql`
      SELECT p.id, p.name, p.price, p.stock, p.is_active, p.category_id, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${validatedData.product_id}
    `;

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'Sản phẩm không tồn tại' },
        { status: 404 }
      );
    }

    const product = products[0];

    if (!product.is_active) {
      return NextResponse.json(
        { error: 'Sản phẩm không còn bán' },
        { status: 400 }
      );
    }

    if (product.stock < validatedData.quantity) {
      return NextResponse.json(
        { error: 'Số lượng sản phẩm không đủ' },
        { status: 400 }
      );
    }

    // Kiểm tra quyền truy cập category
    if (product.category_id) {
      const permission = await sql`
        SELECT id FROM user_category_permissions
        WHERE user_id = ${decoded.userId} AND category_id = ${product.category_id}
      `;

      if (permission.length === 0) {
        return NextResponse.json(
          { error: `Bạn chưa có quyền mua hàng ở khu vực "${product.category_name || 'này'}". Vui lòng liên hệ admin để được cấp quyền.` },
          { status: 403 }
        );
      }
    }

    // Kiểm tra xem bảng cart_items có tồn tại không, nếu chưa thì tạo
    try {
      await sql`SELECT 1 FROM cart_items LIMIT 1`;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        await sql`
          CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id)
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id)`;
      }
    }

    // Thêm hoặc cập nhật số lượng trong giỏ hàng
    const result = await sql`
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES (${decoded.userId}, ${validatedData.product_id}, ${validatedData.quantity})
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET 
        quantity = cart_items.quantity + ${validatedData.quantity},
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, product_id, quantity
    `;

    return NextResponse.json({
      message: 'Đã thêm vào giỏ hàng',
      cart_item: result[0],
    }, { status: 201 });
  } catch (error) {
    logger.error('Add to cart error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

// DELETE: Xóa sản phẩm khỏi giỏ hàng
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const cartItemId = searchParams.get('id');
    const productId = searchParams.get('product_id');

    if (!cartItemId && !productId) {
      return NextResponse.json(
        { error: 'Cần cung cấp id hoặc product_id' },
        { status: 400 }
      );
    }

    if (cartItemId) {
      await sql`
        DELETE FROM cart_items 
        WHERE id = ${parseInt(cartItemId)} AND user_id = ${decoded.userId}
      `;
    } else if (productId) {
      await sql`
        DELETE FROM cart_items 
        WHERE product_id = ${parseInt(productId)} AND user_id = ${decoded.userId}
      `;
    }

    return NextResponse.json({
      message: 'Đã xóa khỏi giỏ hàng',
    });
  } catch (error) {
    logger.error('Delete from cart error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

// PUT: Cập nhật số lượng sản phẩm trong giỏ hàng
export async function PUT(request: NextRequest) {
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
    const { cart_item_id, quantity } = body;

    if (!cart_item_id || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    // Kiểm tra số lượng tồn kho
    const cartItem = await sql`
      SELECT ci.product_id, p.stock 
      FROM cart_items ci
      INNER JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ${cart_item_id} AND ci.user_id = ${decoded.userId}
    `;

    if (cartItem.length === 0) {
      return NextResponse.json(
        { error: 'Sản phẩm không tồn tại trong giỏ hàng' },
        { status: 404 }
      );
    }

    if (cartItem[0].stock < quantity) {
      return NextResponse.json(
        { error: 'Số lượng sản phẩm không đủ' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE cart_items 
      SET quantity = ${quantity}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${cart_item_id} AND user_id = ${decoded.userId}
    `;

    return NextResponse.json({
      message: 'Đã cập nhật số lượng',
    });
  } catch (error) {
    logger.error('Update cart error', error instanceof Error ? error : new Error(String(error)));
    return handleError(error);
  }
}

