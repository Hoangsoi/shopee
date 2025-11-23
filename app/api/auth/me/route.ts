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

    // Kiểm tra xem các cột wallet_balance, commission, is_frozen và vip_level có tồn tại không
    let hasWalletBalance = false;
    let hasCommission = false;
    let hasIsFrozen = false;
    let hasVipLevel = false;
    
    try {
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('wallet_balance', 'commission', 'is_frozen', 'vip_level', 'is_vip')
      ` as Array<{ column_name: string }>;
      
      hasWalletBalance = columns.some((col) => col.column_name === 'wallet_balance');
      hasCommission = columns.some((col) => col.column_name === 'commission');
      hasIsFrozen = columns.some((col) => col.column_name === 'is_frozen');
      hasVipLevel = columns.some((col) => col.column_name === 'vip_level');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Error checking columns:', error);
      }
    }

    // Xây dựng query động dựa trên các cột có sẵn
    let query;
    if (hasWalletBalance && hasCommission && hasIsFrozen && hasVipLevel) {
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
          COALESCE(vip_level, 0) as vip_level,
          created_at 
        FROM users 
        WHERE id = ${decoded.userId}
      `;
    } else if (hasWalletBalance && hasCommission && hasIsFrozen) {
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

    // Xử lý wallet_balance, commission, is_frozen và vip_level
    let walletBalance = 0;
    let commission = 0;
    let isFrozen = false;
    let vipLevel = 0;
    
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

    if (hasVipLevel && user.vip_level !== undefined && user.vip_level !== null) {
      vipLevel = typeof user.vip_level === 'number' 
        ? user.vip_level 
        : parseInt(user.vip_level.toString()) || 0;
      // Đảm bảo vip_level trong khoảng 0-10
      vipLevel = Math.max(0, Math.min(10, vipLevel));
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
        vip_level: vipLevel,
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

