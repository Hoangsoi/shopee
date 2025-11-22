import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Tìm user theo email
    const users = await sql`
      SELECT id, email, password, name, role FROM users WHERE email = ${validatedData.email}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await verifyPassword(validatedData.password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Generate token với role (sử dụng email)
    const token = generateToken(user.id, user.email, user.role || 'user');

    // Set cookie
    const response = NextResponse.json(
      {
        message: 'Đăng nhập thành công',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
        },
        token,
      },
      { status: 200 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    
    // Log chi tiết lỗi để debug
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });

    return NextResponse.json(
      { 
        error: 'Lỗi server khi đăng nhập',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

