import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  user_id: z.number().int().positive('ID người dùng không hợp lệ'),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  agent_code: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  wallet_balance: z.number().optional(),
  commission: z.number().optional(),
  is_frozen: z.boolean().optional(),
});

// Helper to check admin role
async function isAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    console.log('No token found');
    return false;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('Token verification failed');
    return false;
  }
  // Nếu token không có role, query từ database
  if (!decoded.role) {
    try {
      const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
      if (users.length === 0 || users[0].role !== 'admin') {
        console.log('User is not admin');
        return false;
      }
    } catch (error) {
      console.error('Error checking role from database:', error);
      return false;
    }
  } else if (decoded.role !== 'admin') {
    console.log('User role is not admin:', decoded.role);
    return false;
  }
  return true;
}

// GET: Lấy danh sách tất cả users (chỉ admin)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Kiểm tra và tạo cột is_frozen nếu chưa có
    try {
      const checkColumn = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_frozen'
      `;
      if (checkColumn.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN is_frozen BOOLEAN DEFAULT false`;
        console.log('✓ Đã thêm cột is_frozen vào bảng users');
      }
    } catch (error: any) {
      // Bỏ qua lỗi nếu cột đã tồn tại
      if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        console.error('Error checking is_frozen column:', error);
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search'); // Tìm kiếm theo tên, email, phone

    let users;
    try {
      if (search) {
        users = await sql`
          SELECT 
            id,
            email,
            name,
            phone,
            agent_code,
            role,
            wallet_balance,
            commission,
            created_at,
            COALESCE(is_frozen, false) as is_frozen,
            COALESCE(vip_level, 0) as vip_level
          FROM users
          WHERE 
            name ILIKE ${'%' + search + '%'} OR
            email ILIKE ${'%' + search + '%'} OR
            phone ILIKE ${'%' + search + '%'}
          ORDER BY created_at DESC
        `;
      } else {
        users = await sql`
          SELECT 
            id,
            email,
            name,
            phone,
            agent_code,
            role,
            wallet_balance,
            commission,
            created_at,
            COALESCE(is_frozen, false) as is_frozen,
            COALESCE(vip_level, 0) as vip_level
          FROM users
          ORDER BY created_at DESC
        `;
      }
    } catch (error: any) {
      // Nếu lỗi do cột is_frozen chưa tồn tại, thử query lại không có cột đó
      if (error.message?.includes('is_frozen') || error.message?.includes('column')) {
        console.log('Retrying query without is_frozen column...');
        if (search) {
          users = await sql`
            SELECT 
              id,
              email,
              name,
              phone,
              agent_code,
              role,
              wallet_balance,
              commission,
              created_at,
              COALESCE(vip_level, 0) as vip_level
            FROM users
            WHERE 
              name ILIKE ${'%' + search + '%'} OR
              email ILIKE ${'%' + search + '%'} OR
              phone ILIKE ${'%' + search + '%'}
            ORDER BY created_at DESC
          `;
        } else {
          users = await sql`
            SELECT 
              id,
              email,
              name,
              phone,
              agent_code,
              role,
              wallet_balance,
              commission,
              created_at,
              COALESCE(vip_level, 0) as vip_level
            FROM users
            ORDER BY created_at DESC
          `;
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      users: users.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        agent_code: user.agent_code,
        role: user.role || 'user',
        wallet_balance: user.wallet_balance ? parseFloat(user.wallet_balance.toString()) : 0,
        commission: user.commission ? parseFloat(user.commission.toString()) : 0,
        created_at: user.created_at,
        is_frozen: user.is_frozen !== undefined ? (user.is_frozen || false) : false,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách người dùng', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật thông tin user (chỉ admin)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const { user_id, ...updateData } = validatedData;

    // Kiểm tra user có tồn tại không
    const users = await sql`
      SELECT id FROM users WHERE id = ${user_id}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra email trùng (nếu có cập nhật email)
    if (updateData.email) {
      const existingEmail = await sql`
        SELECT id FROM users WHERE email = ${updateData.email} AND id != ${user_id}
      `;
      if (existingEmail.length > 0) {
        return NextResponse.json(
          { error: 'Email đã được sử dụng bởi người dùng khác' },
          { status: 400 }
        );
      }
    }

    // Cập nhật từng trường một cách an toàn
    if (updateData.name !== undefined) {
      await sql`UPDATE users SET name = ${updateData.name}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.email !== undefined) {
      await sql`UPDATE users SET email = ${updateData.email}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.phone !== undefined) {
      await sql`UPDATE users SET phone = ${updateData.phone}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.role !== undefined) {
      await sql`UPDATE users SET role = ${updateData.role}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.wallet_balance !== undefined) {
      await sql`UPDATE users SET wallet_balance = ${updateData.wallet_balance}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.commission !== undefined) {
      await sql`UPDATE users SET commission = ${updateData.commission}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.agent_code !== undefined) {
      await sql`UPDATE users SET agent_code = ${updateData.agent_code}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }
    if (updateData.is_frozen !== undefined) {
      await sql`UPDATE users SET is_frozen = ${updateData.is_frozen}, updated_at = CURRENT_TIMESTAMP WHERE id = ${user_id}`;
    }

    // Lấy thông tin user sau khi cập nhật
    const result = await sql`
      SELECT id, email, name, phone, agent_code, role, wallet_balance, commission, created_at, COALESCE(is_frozen, false) as is_frozen
      FROM users
      WHERE id = ${user_id}
    `;

    return NextResponse.json({
      message: 'Cập nhật thông tin người dùng thành công',
              user: {
                id: result[0].id,
                email: result[0].email,
                name: result[0].name,
                phone: result[0].phone,
                agent_code: result[0].agent_code,
                role: result[0].role,
                wallet_balance: result[0].wallet_balance ? parseFloat(result[0].wallet_balance.toString()) : 0,
                commission: result[0].commission ? parseFloat(result[0].commission.toString()) : 0,
                created_at: result[0].created_at,
                is_frozen: result[0].is_frozen || false,
              },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật thông tin người dùng' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa user (chỉ admin)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Thiếu ID người dùng' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);

    // Không cho xóa chính mình
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId === userIdNum) {
        return NextResponse.json(
          { error: 'Không thể xóa chính mình' },
          { status: 400 }
        );
      }
    }

    const result = await sql`
      DELETE FROM users WHERE id = ${userIdNum} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Xóa người dùng thành công',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa người dùng' },
      { status: 500 }
    );
  }
}

