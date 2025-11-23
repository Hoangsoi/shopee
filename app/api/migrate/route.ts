import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Chỉ admin mới được chạy migration
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập. Vui lòng đăng nhập với tài khoản admin.' },
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
    
    // Kiểm tra role admin
    const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
    if (users.length === 0 || users[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Không có quyền truy cập. Chỉ admin mới được chạy migration.' },
        { status: 403 }
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Bắt đầu migration...');
    }

    // Kiểm tra và thêm cột phone
    const checkPhone = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `;

    if (checkPhone.length === 0) {
      await sql`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Đã thêm cột phone');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Cột phone đã tồn tại');
      }
    }

    // Kiểm tra và thêm cột agent_code
    const checkAgentCode = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'agent_code'
    `;

    if (checkAgentCode.length === 0) {
      await sql`ALTER TABLE users ADD COLUMN agent_code VARCHAR(50)`;
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Đã thêm cột agent_code');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Cột agent_code đã tồn tại');
      }
    }

    // Tạo index cho phone
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Đã tạo index cho phone');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Index có thể đã tồn tại');
      }
    }

    // Kiểm tra kết quả
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('phone', 'agent_code')
      ORDER BY column_name
    `;

    return NextResponse.json({
      success: true,
      message: 'Migration thành công',
      columns: columns,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Migration error:', error);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi migration',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

