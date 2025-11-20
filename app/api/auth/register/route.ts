import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  name: z.string().min(1, 'Tên không được để trống'),
  phone: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'),
  agent_code: z.string().min(1, 'Mã đại lý không được để trống'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Đảm bảo bảng users tồn tại (tự động setup nếu chưa có)
    try {
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
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
      
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
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
        ON CONFLICT (key) DO NOTHING
      `;
    } catch (setupError) {
      console.error('Table setup error (may already exist):', setupError);
      // Tiếp tục vì bảng có thể đã tồn tại
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email}
    `;

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }

    // Kiểm tra số điện thoại đã tồn tại chưa
    const existingPhone = await sql`
      SELECT id FROM users WHERE phone = ${validatedData.phone}
    `;

    if (existingPhone.length > 0) {
      return NextResponse.json(
        { error: 'Số điện thoại đã được sử dụng' },
        { status: 400 }
      );
    }

    // Kiểm tra và tạo bảng settings nếu chưa có
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      // Thêm mã đại lý mặc định nếu chưa có
      await sql`
        INSERT INTO settings (key, value, description) 
        VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
        ON CONFLICT (key) DO NOTHING
      `;
    } catch (setupError) {
      console.error('Settings table setup error:', setupError);
    }

    // Kiểm tra mã đại lý hợp lệ
    const validAgentCode = await sql`
      SELECT value FROM settings WHERE key = 'valid_agent_code'
    `;

    if (validAgentCode.length === 0 || validAgentCode[0].value !== validatedData.agent_code) {
      return NextResponse.json(
        { error: 'Mã đã được sử dụng vui lòng nhập mã khác' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Tạo user mới
    const result = await sql`
      INSERT INTO users (email, password, name, phone, agent_code)
      VALUES (${validatedData.email}, ${hashedPassword}, ${validatedData.name}, ${validatedData.phone}, ${validatedData.agent_code || null})
      RETURNING id, email, name, phone, agent_code, created_at
    `;

    return NextResponse.json(
      {
        message: 'Đăng ký thành công',
        user: {
          id: result[0].id,
          email: result[0].email,
          name: result[0].name,
          phone: result[0].phone,
          agent_code: result[0].agent_code,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    
    // Log chi tiết lỗi để debug
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });

    return NextResponse.json(
      { 
        error: 'Lỗi server khi đăng ký',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

