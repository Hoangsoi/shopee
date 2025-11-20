/**
 * Script để thiết lập database
 * Chạy: npx tsx scripts/setup-db.ts
 * Hoặc: npm run setup-db (nếu đã thêm script vào package.json)
 */

import sql from '../lib/db';

async function setupDatabase() {
  try {
    console.log('Đang thiết lập database...');

    // Tạo bảng users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✓ Bảng users đã được tạo');

    // Tạo index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `;

    console.log('✓ Index đã được tạo');
    console.log('✓ Database đã sẵn sàng!');
  } catch (error) {
    console.error('Lỗi khi thiết lập database:', error);
    process.exit(1);
  }
}

setupDatabase();

