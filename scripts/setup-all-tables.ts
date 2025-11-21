/**
 * Script để tạo tất cả các bảng trong database Neon
 * Chạy: npm run setup-db hoặc npx tsx scripts/setup-all-tables.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// Đọc DATABASE_URL từ .env.local
// Nếu không có dotenv, sẽ đọc trực tiếp từ process.env
let DATABASE_URL: string | undefined;

try {
  // Thử đọc từ .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch (error) {
  // Nếu không đọc được file, dùng process.env
  DATABASE_URL = process.env.DATABASE_URL;
}

// Nếu vẫn chưa có, thử require dotenv
if (!DATABASE_URL) {
  try {
    require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
    DATABASE_URL = process.env.DATABASE_URL;
  } catch (error) {
    // Bỏ qua nếu không có dotenv
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL không được tìm thấy trong .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setupDatabase() {
  console.log('🚀 Bắt đầu tạo các bảng trong database...\n');

  try {
    // 1. Tạo bảng users
    console.log('📋 Đang tạo bảng users...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        agent_code VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        wallet_balance DECIMAL(15, 2) DEFAULT 0,
        commission DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Bảng users đã được tạo');

    // Thêm các cột wallet_balance và commission nếu bảng đã tồn tại
    try {
      const checkWallet = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'wallet_balance'
      `;
      if (checkWallet.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(15, 2) DEFAULT 0`;
        console.log('✅ Đã thêm cột wallet_balance');
      }
    } catch (error) {
      console.log('ℹ Cột wallet_balance có thể đã tồn tại');
    }

    try {
      const checkCommission = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'commission'
      `;
      if (checkCommission.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN commission DECIMAL(15, 2) DEFAULT 0`;
        console.log('✅ Đã thêm cột commission');
      }
    } catch (error) {
      console.log('ℹ Cột commission có thể đã tồn tại');
    }

    // Cập nhật giá trị mặc định cho các user hiện có
    try {
      await sql`UPDATE users SET wallet_balance = 0 WHERE wallet_balance IS NULL`;
      await sql`UPDATE users SET commission = 0 WHERE commission IS NULL`;
    } catch (error) {
      // Ignore if columns don't exist yet
    }

    // Tạo index cho users
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
    console.log('✅ Index cho users đã được tạo\n');

    // 2. Tạo bảng settings
    console.log('📋 Đang tạo bảng settings...');
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Bảng settings đã được tạo');

    // Thêm mã đại lý mặc định
    await sql`
      INSERT INTO settings (key, value, description) 
      VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✅ Mã đại lý mặc định đã được thêm\n');

    // 3. Tạo bảng categories
    console.log('📋 Đang tạo bảng categories...');
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
    console.log('✅ Bảng categories đã được tạo');

    // Tạo index cho categories
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`;
    console.log('✅ Index cho categories đã được tạo');

    // Thêm dữ liệu mẫu cho categories
    await sql`
      INSERT INTO categories (name, slug, discount_percent, sort_order) VALUES
      ('Mỹ phẩm', 'my-pham', 10, 1),
      ('Điện tử', 'dien-tu', 20, 2),
      ('Điện lạnh', 'dien-lanh', 30, 3),
      ('Cao cấp', 'cao-cap', 50, 4),
      ('VIP', 'vip', 0, 5)
      ON CONFLICT (slug) DO NOTHING
    `;
    console.log('✅ Dữ liệu mẫu categories đã được thêm\n');

    // 4. Tạo bảng products
    console.log('📋 Đang tạo bảng products...');
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
    console.log('✅ Bảng products đã được tạo');

    // Tạo index cho products
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)`;
    console.log('✅ Index cho products đã được tạo\n');

    // Kiểm tra kết quả
    console.log('📊 Đang kiểm tra kết quả...\n');
    
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log('✅ Các bảng đã được tạo:');
    tables.forEach((table: any) => {
      console.log(`   - ${table.table_name}`);
    });

    const categoriesCount = await sql`SELECT COUNT(*)::int as count FROM categories`;
    const usersCount = await sql`SELECT COUNT(*)::int as count FROM users`;
    const productsCount = await sql`SELECT COUNT(*)::int as count FROM products`;

    console.log('\n📈 Thống kê:');
    console.log(`   - Categories: ${categoriesCount[0].count} bản ghi`);
    console.log(`   - Users: ${usersCount[0].count} bản ghi`);
    console.log(`   - Products: ${productsCount[0].count} bản ghi`);

    console.log('\n🎉 Hoàn thành! Tất cả các bảng đã được tạo thành công.');

  } catch (error) {
    console.error('\n❌ Lỗi khi tạo bảng:', error);
    if (error instanceof Error) {
      console.error('Chi tiết lỗi:', error.message);
    }
    process.exit(1);
  }
}

// Chạy script
setupDatabase();

