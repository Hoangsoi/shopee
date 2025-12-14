import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { handleError } from '@/lib/error-handler';

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
          phone VARCHAR(20) UNIQUE,
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Table setup error (may already exist):', setupError);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Settings table setup error:', setupError);
      }
    }

    // Kiểm tra mã đại lý hợp lệ
    const validAgentCode = await sql`
      SELECT value FROM settings WHERE key = 'valid_agent_code'
    `;

    if (validAgentCode.length === 0 || validAgentCode[0].value !== validatedData.agent_code) {
      return NextResponse.json(
        { error: 'Mã đã đăng ký' },
        { status: 400 }
      );
    }

    // Đảm bảo các cột wallet_balance, commission, role, is_frozen tồn tại
    try {
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('wallet_balance', 'commission', 'role', 'is_frozen')
      `;
      
      const existingColumns = columns.map((col: any) => col.column_name);
      
      if (!existingColumns.includes('wallet_balance')) {
        await sql`ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(15, 2) DEFAULT 0`;
      }
      if (!existingColumns.includes('commission')) {
        await sql`ALTER TABLE users ADD COLUMN commission DECIMAL(15, 2) DEFAULT 0`;
      }
      if (!existingColumns.includes('role')) {
        await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
      }
      if (!existingColumns.includes('is_frozen')) {
        await sql`ALTER TABLE users ADD COLUMN is_frozen BOOLEAN DEFAULT false`;
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error adding columns:', error);
        }
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Tạo user mới với wallet_balance và commission = 0
    // Sử dụng query động để tránh lỗi nếu cột chưa tồn tại
    let result;
    try {
      result = await sql`
        INSERT INTO users (email, password, name, phone, agent_code, wallet_balance, commission, role, is_frozen)
        VALUES (${validatedData.email}, ${hashedPassword}, ${validatedData.name}, ${validatedData.phone}, ${validatedData.agent_code || null}, 0, 0, 'user', false)
        RETURNING id, email, name, phone, agent_code, wallet_balance, commission, created_at
      `;
    } catch (insertError: any) {
      // Nếu lỗi do thiếu cột, thử INSERT không có các cột đó
      if (insertError.message?.includes('column') || insertError.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Retrying insert without optional columns...');
        }
        result = await sql`
          INSERT INTO users (email, password, name, phone, agent_code)
          VALUES (${validatedData.email}, ${hashedPassword}, ${validatedData.name}, ${validatedData.phone}, ${validatedData.agent_code || null})
          RETURNING id, email, name, phone, agent_code, created_at
        `;
      } else {
        throw insertError;
      }
    }

    // Tự động cấp quyền cho category "Mỹ phẩm" (slug: 'my-pham')
    try {
      // Tạo bảng user_category_permissions nếu chưa có
      await sql`
        CREATE TABLE IF NOT EXISTS user_category_permissions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          granted_by INTEGER REFERENCES users(id),
          UNIQUE(user_id, category_id)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_category_permissions_user_id ON user_category_permissions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_category_permissions_category_id ON user_category_permissions(category_id)`;
      
      // Tìm category "Mỹ phẩm" (slug: 'my-pham')
      const myPhamCategory = await sql`
        SELECT id FROM categories WHERE slug = 'my-pham' LIMIT 1
      `;
      
      if (myPhamCategory.length > 0) {
        // Cấp quyền cho user mới
        await sql`
          INSERT INTO user_category_permissions (user_id, category_id)
          VALUES (${result[0].id}, ${myPhamCategory[0].id})
          ON CONFLICT (user_id, category_id) DO NOTHING
        `;
        if (process.env.NODE_ENV === 'development') {
          console.log(`✓ Đã cấp quyền "Mỹ phẩm" cho user ${result[0].id}`);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠ Category "Mỹ phẩm" chưa tồn tại, bỏ qua cấp quyền mặc định');
        }
      }
    } catch (permissionError) {
      // Log lỗi nhưng không làm gián đoạn quá trình đăng ký
      if (process.env.NODE_ENV === 'development') {
        console.error('Error granting default category permission:', permissionError);
      }
    }

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
    return handleError(error);
  }
}

