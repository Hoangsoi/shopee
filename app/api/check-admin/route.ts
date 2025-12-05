import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// API để kiểm tra các tài khoản admin (không cần authentication để dễ debug)
export async function GET(request: NextRequest) {
  try {
    // Lấy tất cả users có role = 'admin'
    const adminUsers = await sql`
      SELECT 
        id,
        email,
        name,
        phone,
        agent_code,
        role,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(TRIM(role)) = 'admin'
      ORDER BY created_at ASC
    `;

    // Lấy tất cả users để so sánh
    const allUsers = await sql`
      SELECT 
        id,
        email,
        name,
        role,
        created_at
      FROM users
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      adminCount: adminUsers.length,
      adminUsers: adminUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        agent_code: user.agent_code,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
      allUsersCount: allUsers.length,
      allUsers: allUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        created_at: user.created_at,
      })),
    });
  } catch (error) {
    console.error('Check admin error:', error);
    return NextResponse.json(
      { 
        error: 'Lỗi khi kiểm tra tài khoản admin',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

