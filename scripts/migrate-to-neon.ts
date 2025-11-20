/**
 * Script để migration database lên Neon
 * Chạy: npx tsx scripts/migrate-to-neon.ts
 * Hoặc: npm run migrate (nếu đã thêm script vào package.json)
 */

import sql from '../lib/db';

async function migrateDatabase() {
  try {
    console.log('🚀 Bắt đầu migration database lên Neon...\n');

    // 1. Tạo bảng users
    console.log('📦 Đang tạo/cập nhật bảng users...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        agent_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Thêm cột phone nếu chưa có
    try {
      const checkPhone = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
      `;
      if (checkPhone.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
        console.log('  ✓ Đã thêm cột phone');
      }
    } catch (error) {
      console.log('  ℹ Cột phone đã tồn tại');
    }

    // Thêm cột agent_code nếu chưa có
    try {
      const checkAgentCode = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
      `;
      if (checkAgentCode.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN agent_code VARCHAR(50)`;
        console.log('  ✓ Đã thêm cột agent_code');
      }
    } catch (error) {
      console.log('  ℹ Cột agent_code đã tồn tại');
    }

    // Tạo index
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
    console.log('  ✓ Index đã được tạo\n');

    // 2. Tạo bảng settings
    console.log('📦 Đang tạo/cập nhật bảng settings...');
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Thêm mã đại lý mặc định
    await sql`
      INSERT INTO settings (key, value, description) 
      VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('  ✓ Bảng settings đã được tạo\n');

    // 3. Kiểm tra kết quả
    console.log('🔍 Đang kiểm tra kết quả...');
    const usersColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const settingsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `;

    console.log('\n✅ Migration thành công!\n');
    console.log('📊 Bảng users có các cột:');
    usersColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n📊 Bảng settings có các cột:');
    settingsColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✨ Database đã sẵn sàng!');
  } catch (error) {
    console.error('\n❌ Lỗi khi migration:', error);
    process.exit(1);
  }
}

migrateDatabase();

