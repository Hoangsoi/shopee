import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Helper to check admin role
async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  
  const decoded = verifyToken(token);
  if (!decoded) return false;
  
  // Check role from database
  try {
    const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
    return users.length > 0 && users[0].role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Chỉ admin mới được truy cập endpoint này
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { error: 'Không có quyền truy cập. Chỉ admin mới được sử dụng endpoint này.' },
      { status: 403 }
    );
  }
  try {
    // Test connection
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    // Check if users table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as table_exists
    `;

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        currentTime: result[0].current_time,
        pgVersion: result[0].pg_version,
        usersTableExists: tableCheck[0].table_exists,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Chỉ log trong development
    if (process.env.NODE_ENV === 'development') {
      console.error('Database test error:', error);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi kiểm tra database',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

