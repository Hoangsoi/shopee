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

    // Kiểm tra xem các cột wallet_balance, commission và is_frozen có tồn tại không
    let hasWalletBalance = false;
    let hasCommission = false;
    let hasIsFrozen = false;
    
    try {
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('wallet_balance', 'commission', 'is_frozen')
      `;
      
      hasWalletBalance = columns.some((col: any) => col.column_name === 'wallet_balance');
      hasCommission = columns.some((col: any) => col.column_name === 'commission');
      hasIsFrozen = columns.some((col: any) => col.column_name === 'is_frozen');
    } catch (error) {
      console.log('Error checking columns:', error);
    }

    // Xây dựng query động dựa trên các cột có sẵn
    let query;
    if (hasWalletBalance && hasCommission && hasIsFrozen) {
      query = sql`
        SELECT 
          id, 
          email, 
          name, 
          phone,
          agent_code,
          role, 
          wallet_balance,
          commission,
          COALESCE(is_frozen, false) as is_frozen,
          created_at 
        FROM users 
        WHERE id = ${decoded.userId}
      `;
    } else if (hasWalletBalance && hasCommission) {
      query = sql`
        SELECT 
          id, 
          email, 
          name, 
          phone,
          agent_code,
          role, 
          wallet_balance,
          commission,
          created_at 
        FROM users 
        WHERE id = ${decoded.userId}
      `;
    } else {
      // Nếu chưa có các cột mới, chỉ select các cột cơ bản
      query = sql`
        SELECT 
          id, 
          email, 
          name, 
          phone,
          agent_code,
          role, 
          created_at 
        FROM users 
        WHERE id = ${decoded.userId}
      `;
    }

    const users = await query;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Xử lý wallet_balance, commission và is_frozen
    let walletBalance = 0;
    let commission = 0;
    let isFrozen = false;
    
    if (hasWalletBalance && user.wallet_balance !== undefined && user.wallet_balance !== null) {
      walletBalance = typeof user.wallet_balance === 'string' 
        ? parseFloat(user.wallet_balance) 
        : parseFloat(user.wallet_balance.toString());
    }
    
    if (hasCommission && user.commission !== undefined && user.commission !== null) {
      commission = typeof user.commission === 'string' 
        ? parseFloat(user.commission) 
        : parseFloat(user.commission.toString());
    }

    if (hasIsFrozen && user.is_frozen !== undefined && user.is_frozen !== null) {
      isFrozen = user.is_frozen === true || user.is_frozen === 'true';
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        agent_code: user.agent_code || null,
        role: user.role || 'user',
        wallet_balance: walletBalance,
        commission: commission,
        is_frozen: isFrozen,
        created_at: user.created_at,
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

