import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST() {
  try {
    console.log('Bắt đầu migration...');

    // Kiểm tra và thêm cột phone
    const checkPhone = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `;

    if (checkPhone.length === 0) {
      await sql`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
      console.log('✓ Đã thêm cột phone');
    } else {
      console.log('✓ Cột phone đã tồn tại');
    }

    // Kiểm tra và thêm cột agent_code
    const checkAgentCode = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'agent_code'
    `;

    if (checkAgentCode.length === 0) {
      await sql`ALTER TABLE users ADD COLUMN agent_code VARCHAR(50)`;
      console.log('✓ Đã thêm cột agent_code');
    } else {
      console.log('✓ Cột agent_code đã tồn tại');
    }

    // Tạo index cho phone
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
      console.log('✓ Đã tạo index cho phone');
    } catch (error) {
      console.log('Index có thể đã tồn tại');
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
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi migration',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

