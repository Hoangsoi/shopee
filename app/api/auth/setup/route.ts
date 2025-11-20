import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST() {
  try {
    // Tạo bảng users nếu chưa tồn tại
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

    // Thêm các cột mới nếu bảng đã tồn tại nhưng chưa có các cột này
    try {
      const checkPhone = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
      `;
      if (checkPhone.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
      }
    } catch (error) {
      console.log('Phone column may already exist');
    }

    try {
      const checkAgentCode = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
      `;
      if (checkAgentCode.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN agent_code VARCHAR(50)`;
      }
    } catch (error) {
      console.log('Agent code column may already exist');
    }

    try {
      const checkRole = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `;
      if (checkRole.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
      }
    } catch (error) {
      console.log('Role column may already exist');
    }

    // Tạo index nếu chưa tồn tại
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)
    `;

    // Tạo bảng settings
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

    return NextResponse.json(
      { message: 'Database đã được thiết lập thành công' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Setup database error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Lỗi khi thiết lập database',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

