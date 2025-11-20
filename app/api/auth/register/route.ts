import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  name: z.string().min(1, 'Tên không được để trống'),
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    } catch (setupError) {
      console.error('Table setup error (may already exist):', setupError);
      // Tiếp tục vì bảng có thể đã tồn tại
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Tạo user mới
    const result = await sql`
      INSERT INTO users (email, password, name)
      VALUES (${validatedData.email}, ${hashedPassword}, ${validatedData.name})
      RETURNING id, email, name, created_at
    `;

    return NextResponse.json(
      {
        message: 'Đăng ký thành công',
        user: {
          id: result[0].id,
          email: result[0].email,
          name: result[0].name,
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

