import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const users = await sql`
      SELECT id, email, name, role, created_at FROM users WHERE id = ${decoded.userId}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        role: users[0].role || 'user',
        created_at: users[0].created_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    // Log chi tiết lỗi để debug
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });

    return NextResponse.json(
      { 
        error: 'Lỗi server',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

