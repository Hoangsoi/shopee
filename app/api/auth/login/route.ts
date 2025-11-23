import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { handleError } from '@/lib/error-handler';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(`login:${clientId}`, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }

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
    return handleError(error);
  }
}

