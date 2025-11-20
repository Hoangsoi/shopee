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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tạo index nếu chưa tồn tại
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
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

