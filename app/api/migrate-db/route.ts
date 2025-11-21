import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Hiển thị trang HTML với nút chạy migration
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra các bảng và cột hiện có
    const usersColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const settingsColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `;

    const validAgentCode = await sql`
      SELECT value FROM settings WHERE key = 'valid_agent_code'
    `;

    const hasRoleColumn = usersColumns.some((col: any) => col.column_name === 'role');

    // Trả về HTML page
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Migration Database</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
    <h1 class="text-3xl font-bold text-orange-600 mb-6">Migration Database</h1>
    
    <div class="mb-6">
      <p class="text-gray-600 mb-4">Click nút bên dưới để tự động cập nhật tất cả các bảng và cột lên Neon database.</p>
      <button 
        id="migrateBtn"
        onclick="runMigration()"
        class="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🚀 CHẠY MIGRATION
      </button>
    </div>

    <div id="result" class="hidden"></div>
    <div id="error" class="hidden"></div>

    <div class="mt-6 pt-6 border-t border-gray-200">
      <h2 class="text-lg font-semibold mb-4">📊 Trạng thái hiện tại:</h2>
      <div class="space-y-4 text-sm">
        <div>
          <strong>Bảng users:</strong> ${usersColumns.length} cột
          ${hasRoleColumn ? '<span class="text-green-600 ml-2">✓ Có cột role</span>' : '<span class="text-red-600 ml-2">✗ Thiếu cột role</span>'}
        </div>
        <div>
          <strong>Bảng settings:</strong> ${settingsColumns.length} cột
        </div>
        <div>
          <strong>Mã đại lý hiện tại:</strong> <span class="font-mono text-orange-600">${validAgentCode.length > 0 ? validAgentCode[0].value : 'Chưa có'}</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function runMigration() {
      const btn = document.getElementById('migrateBtn');
      const resultDiv = document.getElementById('result');
      const errorDiv = document.getElementById('error');
      
      btn.disabled = true;
      btn.textContent = 'Đang migration...';
      resultDiv.classList.add('hidden');
      errorDiv.classList.add('hidden');

      try {
        const response = await fetch('/api/migrate-db', { method: 'POST' });
        const data = await response.json();

        if (response.ok && data.success) {
          resultDiv.className = 'bg-green-50 border border-green-200 text-green-600 py-3 px-4 rounded-lg mb-4';
          resultDiv.innerHTML = \`
            <strong>✅ \${data.message}</strong>
            \${data.addedColumns && data.addedColumns.length > 0 ? 
              '<div class="mt-2">Đã thêm các cột: ' + data.addedColumns.join(', ') + '</div>' : 
              '<div class="mt-2">Tất cả cột đã tồn tại</div>'
            }
            <div class="mt-4">
              <strong>Bảng users:</strong> \${data.tables.users.count} cột<br>
              <strong>Bảng settings:</strong> \${data.tables.settings.count} cột<br>
              <strong>Mã đại lý:</strong> \${data.currentAgentCode}
            </div>
          \`;
          resultDiv.classList.remove('hidden');
          
          // Reload sau 2 giây để cập nhật trạng thái
          setTimeout(() => location.reload(), 2000);
        } else {
          errorDiv.className = 'bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-4';
          errorDiv.innerHTML = \`<strong>Lỗi:</strong> \${data.error || data.details || 'Migration thất bại'}\`;
          errorDiv.classList.remove('hidden');
        }
      } catch (error) {
        errorDiv.className = 'bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-4';
        errorDiv.innerHTML = '<strong>Lỗi:</strong> Có lỗi xảy ra khi kết nối đến server';
        errorDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 CHẠY MIGRATION';
      }
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Migration Database</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
    <h1 class="text-3xl font-bold text-orange-600 mb-6">Migration Database</h1>
    <div class="bg-yellow-50 border border-yellow-200 text-yellow-600 py-3 px-4 rounded-lg">
      <strong>Thông báo:</strong> Chưa có bảng nào được tạo. Hãy chạy migration để tạo database.
    </div>
    <button 
      onclick="runMigration()"
      class="w-full mt-4 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
    >
      🚀 CHẠY MIGRATION
    </button>
  </div>
  <script>
    async function runMigration() {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = 'Đang migration...';
      try {
        const response = await fetch('/api/migrate-db', { method: 'POST' });
        const data = await response.json();
        if (response.ok && data.success) {
          alert('Migration thành công! Trang sẽ reload...');
          location.reload();
        } else {
          alert('Lỗi: ' + (data.error || 'Migration thất bại'));
        }
      } catch (error) {
        alert('Lỗi kết nối');
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 CHẠY MIGRATION';
      }
    }
  </script>
</body>
</html>
    `;
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

// POST: Chạy migration
export async function POST() {
  try {
    console.log('Bắt đầu migration database...');

    // 1. Tạo bảng users với đầy đủ cột
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        agent_code VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng users đã được tạo/cập nhật');

    // 2. Kiểm tra và thêm các cột cần thiết nếu bảng users đã tồn tại
    const addedColumns: string[] = [];

    // Thêm cột phone
    try {
      const checkPhone = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
      `;
      if (checkPhone.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
        addedColumns.push('phone');
        console.log('✓ Đã thêm cột phone vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột phone:', error);
      }
    }

    // Thêm cột agent_code
    try {
      const checkAgentCode = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
      `;
      if (checkAgentCode.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN agent_code VARCHAR(50)`;
        addedColumns.push('agent_code');
        console.log('✓ Đã thêm cột agent_code vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột agent_code:', error);
      }
    }

    // Thêm cột role
    try {
      const checkRole = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `;
      if (checkRole.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
        addedColumns.push('role');
        console.log('✓ Đã thêm cột role vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột role:', error);
      }
    }

    // Thêm cột wallet_balance
    try {
      const checkWallet = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'wallet_balance'
      `;
      if (checkWallet.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(15, 2) DEFAULT 0`;
        addedColumns.push('wallet_balance');
        console.log('✓ Đã thêm cột wallet_balance vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột wallet_balance:', error);
      }
    }

    // Thêm cột commission
    try {
      const checkCommission = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'commission'
      `;
      if (checkCommission.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN commission DECIMAL(15, 2) DEFAULT 0`;
        addedColumns.push('commission');
        console.log('✓ Đã thêm cột commission vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột commission:', error);
      }
    }

    // Thêm cột is_frozen
    try {
      const checkIsFrozen = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_frozen'
      `;
      if (checkIsFrozen.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN is_frozen BOOLEAN DEFAULT false`;
        addedColumns.push('is_frozen');
        console.log('✓ Đã thêm cột is_frozen vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột is_frozen:', error);
      }
    }

    // Cập nhật giá trị mặc định cho các user hiện có
    try {
      await sql`UPDATE users SET wallet_balance = 0 WHERE wallet_balance IS NULL`;
      await sql`UPDATE users SET commission = 0 WHERE commission IS NULL`;
    } catch (error) {
      // Ignore if columns don't exist yet
    }

    // Cập nhật role cho các user hiện có nếu NULL
    try {
      await sql`UPDATE users SET role = 'user' WHERE role IS NULL`;
    } catch (error) {
      // Ignore if column doesn't exist yet
    }

    // 3. Tạo index cho users
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
    console.log('✓ Index cho bảng users đã được tạo');

    // 4. Tạo bảng settings
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng settings đã được tạo');

    // 5. Thêm mã đại lý mặc định vào settings
    await sql`
      INSERT INTO settings (key, value, description) 
      VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✓ Mã đại lý mặc định đã được thêm vào settings');

    // 6. Tạo bảng categories
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        icon VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng categories đã được tạo');

    // 7. Tạo bảng products
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2),
        image_url TEXT,
        category_id INTEGER REFERENCES categories(id),
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng products đã được tạo');

    // 8. Tạo index cho products và categories
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`;
    console.log('✓ Index cho products và categories đã được tạo');

    // 9. Thêm dữ liệu mẫu cho categories
    await sql`
      INSERT INTO categories (name, slug, discount_percent, sort_order) VALUES
      ('Mỹ phẩm', 'my-pham', 10, 1),
      ('Điện tử', 'dien-tu', 20, 2),
      ('Điện lạnh', 'dien-lanh', 30, 3),
      ('Cao cấp', 'cao-cap', 50, 4),
      ('VIP', 'vip', 0, 5)
      ON CONFLICT (slug) DO NOTHING
    `;
    console.log('✓ Dữ liệu mẫu categories đã được thêm');

    // 10. Tạo bảng bank_accounts
    await sql`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bank_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        account_holder_name VARCHAR(255) NOT NULL,
        branch VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng bank_accounts đã được tạo');

    // Tạo index cho bank_accounts
    await sql`CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id)`;
    console.log('✓ Index cho bank_accounts đã được tạo');

    // 11. Tạo bảng cart_items
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
    console.log('✓ Bảng cart_items đã được tạo');

    // Tạo index cho cart_items
    await sql`CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id)`;
    console.log('✓ Index cho cart_items đã được tạo');

    // 12. Tạo bảng orders
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
    console.log('✓ Bảng orders đã được tạo');

    // Tạo index cho orders
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`;
    console.log('✓ Index cho orders đã được tạo');

    // 13. Tạo bảng order_items
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
    console.log('✓ Bảng order_items đã được tạo');

    // Tạo index cho order_items
    await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)`;
    console.log('✓ Index cho order_items đã được tạo');

    // 14. Tạo bảng transactions
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        description TEXT,
        bank_account_id INTEGER REFERENCES bank_accounts(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng transactions đã được tạo');

    // Tạo index cho transactions
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC)`;
    console.log('✓ Index cho transactions đã được tạo');

    // 15. Tạo bảng notifications
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng notifications đã được tạo');

    // Tạo index cho notifications
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_sort ON notifications(sort_order)`;
    console.log('✓ Index cho notifications đã được tạo');

    // Thêm dữ liệu mẫu cho notifications
    await sql`
      INSERT INTO notifications (content, is_active, sort_order) VALUES
      ('🎉 Khuyến mãi đặc biệt - Giảm giá lên đến 50%', true, 1),
      ('🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ', true, 2),
      ('⭐ Sản phẩm mới cập nhật hàng ngày', true, 3),
      ('💎 Chương trình VIP với nhiều ưu đãi độc quyền', true, 4)
      ON CONFLICT DO NOTHING
    `;
    console.log('✓ Dữ liệu mẫu notifications đã được thêm');

    // 16. Tạo bảng banners
    await sql`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        title VARCHAR(255),
        link_url TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng banners đã được tạo');

    // Tạo index cho banners
    await sql`CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners(sort_order)`;
    console.log('✓ Index cho banners đã được tạo');

    // Thêm dữ liệu mẫu cho banners
    await sql`
      INSERT INTO banners (image_url, title, is_active, sort_order) VALUES
      ('https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', 'Banner 1', true, 1),
      ('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', 'Banner 2', true, 2),
      ('https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', 'Banner 3', true, 3),
      ('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', 'Banner 4', true, 4),
      ('https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', 'Banner 5', true, 5)
      ON CONFLICT DO NOTHING
    `;
    console.log('✓ Dữ liệu mẫu banners đã được thêm');

    // 6. Kiểm tra kết quả
    const usersColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const settingsColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `;

    const categoriesColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `;

    const productsColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `;

    const validAgentCode = await sql`
      SELECT value FROM settings WHERE key = 'valid_agent_code'
    `;

    const categoriesCount = await sql`SELECT COUNT(*)::int as count FROM categories`;

    return NextResponse.json({
      success: true,
      message: 'Migration database thành công!',
      addedColumns: addedColumns,
      tables: {
        users: {
          columns: usersColumns,
          count: usersColumns.length,
        },
        settings: {
          columns: settingsColumns,
          count: settingsColumns.length,
        },
        categories: {
          columns: categoriesColumns,
          count: categoriesColumns.length,
          dataCount: categoriesCount[0]?.count || 0,
        },
        products: {
          columns: productsColumns,
          count: productsColumns.length,
        },
      },
      currentAgentCode: validAgentCode.length > 0 ? validAgentCode[0].value : 'SH6688',
    });
  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi migration database',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

