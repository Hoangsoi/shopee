/**
 * Script để set role admin cho user
 * Chạy: tsx scripts/set-admin.ts admin@gmail.com
 * Hoặc: npm run set-admin admin@gmail.com (nếu đã thêm script vào package.json)
 */

import sql from '../lib/db';

async function setAdmin(emailOrId: string) {
  try {
    console.log('🔍 Đang kiểm tra user...');

    // Kiểm tra xem là email hay ID
    const isEmail = emailOrId.includes('@');
    
    let user;
    if (isEmail) {
      // Tìm user theo email
      const users = await sql`
        SELECT id, email, name, role 
        FROM users 
        WHERE email = ${emailOrId}
      `;
      user = users[0];
    } else {
      // Tìm user theo ID
      const userId = parseInt(emailOrId);
      if (isNaN(userId)) {
        console.error('❌ ID không hợp lệ:', emailOrId);
        process.exit(1);
      }
      const users = await sql`
        SELECT id, email, name, role 
        FROM users 
        WHERE id = ${userId}
      `;
      user = users[0];
    }

    if (!user) {
      console.error(`❌ Không tìm thấy user với ${isEmail ? 'email' : 'ID'}: ${emailOrId}`);
      process.exit(1);
    }

    console.log('📋 Thông tin user hiện tại:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role hiện tại: ${user.role || 'user'}`);

    // Kiểm tra xem đã là admin chưa
    if (user.role === 'admin') {
      console.log('✅ User đã là admin rồi!');
      return;
    }

    // Đảm bảo cột role tồn tại
    try {
      const checkRole = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `;
      if (checkRole.length === 0) {
        console.log('➕ Đang thêm cột role...');
        await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
        console.log('✅ Đã thêm cột role');
      }
    } catch (error) {
      console.log('⚠️  Cột role có thể đã tồn tại');
    }

    // Set role admin
    console.log('🔧 Đang set role admin...');
    const result = await sql`
      UPDATE users 
      SET role = 'admin', updated_at = CURRENT_TIMESTAMP
      WHERE ${isEmail ? sql`email = ${emailOrId}` : sql`id = ${parseInt(emailOrId)}`}
      RETURNING id, email, name, role
    `;

    if (result.length === 0) {
      console.error('❌ Không thể cập nhật role');
      process.exit(1);
    }

    console.log('\n✅ Đã set role admin thành công!');
    console.log('📋 Thông tin user sau khi cập nhật:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Name: ${result[0].name}`);
    console.log(`   Role: ${result[0].role}`);
    console.log('\n⚠️  Lưu ý: Bạn cần đăng xuất và đăng nhập lại để có hiệu lực!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

// Lấy tham số từ command line
const emailOrId = process.argv[2];

if (!emailOrId) {
  console.error('❌ Vui lòng cung cấp email hoặc ID của user');
  console.log('\n📖 Cách sử dụng:');
  console.log('   tsx scripts/set-admin.ts admin@gmail.com');
  console.log('   tsx scripts/set-admin.ts 1');
  process.exit(1);
}

setAdmin(emailOrId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });

