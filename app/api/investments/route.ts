import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getVietnamTime, addDaysVietnamTime, toVietnamTimeISO } from '@/lib/timezone-utils';

// GET: Lấy thông tin đầu tư của user hiện tại
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

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Kiểm tra và tạo bảng investments nếu chưa có
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS investments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15, 2) NOT NULL,
          daily_profit_rate DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
          investment_days INTEGER NOT NULL DEFAULT 1,
          total_profit DECIMAL(15, 2) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          maturity_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_profit_calculated_at TIMESTAMP
        )
      `;
      
      // Thêm cột investment_days và maturity_date nếu chưa có
      try {
        await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS investment_days INTEGER DEFAULT 1`;
      } catch (error) {
        // Cột đã tồn tại
      }
      try {
        await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMP`;
      } catch (error) {
        // Cột đã tồn tại
      }
    } catch (error) {
      // Bảng đã tồn tại, tiếp tục
    }

    // Lấy tất cả đầu tư của user
    const investments = await sql`
      SELECT 
        id,
        amount,
        daily_profit_rate,
        investment_days,
        total_profit,
        status,
        maturity_date,
        created_at,
        updated_at,
        last_profit_calculated_at
      FROM investments
      WHERE user_id = ${decoded.userId}
      ORDER BY created_at DESC
    `;

    // Lấy transactions liên quan đến đầu tư (hoàn gốc và hoa hồng)
    const investmentIds = investments.map((inv: any) => inv.id);
    let returnTransactions: any[] = [];
    
    if (investmentIds.length > 0) {
      try {
        // Lấy các transactions có description chứa "Hoàn gốc đầu tư" hoặc "Hoàn hoa hồng đầu tư"
        const transactions = await sql`
          SELECT 
            id,
            type,
            amount,
            description,
            created_at
          FROM transactions
          WHERE user_id = ${decoded.userId}
            AND (
              description LIKE 'Hoàn gốc đầu tư:%'
              OR description LIKE 'Hoàn hoa hồng đầu tư:%'
            )
          ORDER BY created_at DESC
        `;
        
        returnTransactions = transactions.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount.toString()),
          description: t.description,
          created_at: t.created_at,
        }));
      } catch (error) {
        // Bảng transactions có thể chưa tồn tại, bỏ qua
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching return transactions:', error);
        }
      }
    }

    // Tính tổng số tiền đầu tư và tổng lợi nhuận
    const activeInvestments = investments.filter((inv: any) => inv.status === 'active');
    const totalInvested = activeInvestments.reduce((sum: number, inv: any) => 
      sum + parseFloat(inv.amount.toString()), 0
    );
    const totalProfit = activeInvestments.reduce((sum: number, inv: any) => 
      sum + parseFloat(inv.total_profit?.toString() || '0'), 0
    );

    return NextResponse.json({
      investments: investments.map((inv: any) => ({
        id: inv.id,
        amount: parseFloat(inv.amount.toString()),
        daily_profit_rate: parseFloat(inv.daily_profit_rate.toString()),
        investment_days: inv.investment_days || 1,
        total_profit: parseFloat(inv.total_profit?.toString() || '0'),
        status: inv.status,
        maturity_date: inv.maturity_date,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        last_profit_calculated_at: inv.last_profit_calculated_at,
      })),
      return_transactions: returnTransactions,
      summary: {
        total_invested: totalInvested,
        total_profit: totalProfit,
        active_count: activeInvestments.length,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get investments error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin đầu tư' },
      { status: 500 }
    );
  }
}

// POST: Tạo đầu tư mới
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, investment_days } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Số tiền đầu tư không hợp lệ' },
        { status: 400 }
      );
    }

    const days = investment_days || 1;
    if (typeof days !== 'number' || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Số ngày đầu tư phải từ 1 đến 365 ngày' },
        { status: 400 }
      );
    }

    // Kiểm tra tài khoản có bị đóng băng không
    const user = await sql`
      SELECT is_frozen, wallet_balance FROM users WHERE id = ${decoded.userId}
    `;

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    if (user[0].is_frozen) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị đóng băng. Không thể đầu tư.' },
        { status: 403 }
      );
    }

    const walletBalance = parseFloat(user[0].wallet_balance?.toString() || '0');
    if (walletBalance < amount) {
      return NextResponse.json(
        { error: 'Số dư ví không đủ để đầu tư' },
        { status: 400 }
      );
    }

    // Lấy tỷ lệ lợi nhuận từ settings dựa trên số ngày
    let dailyProfitRate = 1.00; // Mặc định 1%
    try {
      const setting = await sql`
        SELECT value FROM settings WHERE key = 'investment_rates_by_days'
        ORDER BY updated_at DESC LIMIT 1
      `;
      
      if (setting.length > 0) {
        try {
          const rates = JSON.parse(setting[0].value);
          if (Array.isArray(rates) && rates.length > 0) {
            // Sắp xếp rates theo min_days tăng dần
            const sortedRates = [...rates].sort((a: any, b: any) => a.min_days - b.min_days);
            
            // Tìm rate phù hợp với số ngày
            for (const rateConfig of sortedRates) {
              if (days >= rateConfig.min_days) {
                // Nếu không có max_days hoặc days <= max_days
                if (!rateConfig.max_days || days <= rateConfig.max_days) {
                  dailyProfitRate = rateConfig.rate;
                  break;
                }
              }
            }
            
            // Nếu không tìm thấy, lấy rate của mức cao nhất
            if (dailyProfitRate === 1.00 && sortedRates.length > 0) {
              const highestRate = sortedRates[sortedRates.length - 1];
              if (days >= highestRate.min_days) {
                dailyProfitRate = highestRate.rate;
              }
            }
          }
        } catch (parseError) {
          // Nếu parse lỗi, thử lấy rate cũ (backward compatibility)
          const oldSetting = await sql`
            SELECT value FROM settings WHERE key = 'investment_daily_profit_rate'
            ORDER BY updated_at DESC LIMIT 1
          `;
          if (oldSetting.length > 0) {
            dailyProfitRate = parseFloat(oldSetting[0].value) || 1.00;
          }
        }
      } else {
        // Thử lấy rate cũ (backward compatibility)
        const oldSetting = await sql`
          SELECT value FROM settings WHERE key = 'investment_daily_profit_rate'
          ORDER BY updated_at DESC LIMIT 1
        `;
        if (oldSetting.length > 0) {
          dailyProfitRate = parseFloat(oldSetting[0].value) || 1.00;
        }
      }
    } catch (error) {
      // Sử dụng giá trị mặc định
    }

    // Trừ tiền từ ví
    await sql`
      UPDATE users 
      SET wallet_balance = wallet_balance - ${amount}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${decoded.userId}
    `;

    // Tính ngày đáo hạn: thêm đúng số ngày từ thời điểm hiện tại
    // Lấy thời gian hiện tại (server time, UTC)
    const now = new Date();
    // Tính maturity_date: thêm đúng số ngày * 24 giờ
    const maturityDate = new Date(now);
    maturityDate.setTime(maturityDate.getTime() + (days * 24 * 60 * 60 * 1000));

    // Tạo đầu tư mới
    // Lưu maturity_date vào database (database sẽ lưu dưới dạng timestamp)
    const result = await sql`
      INSERT INTO investments (user_id, amount, daily_profit_rate, investment_days, status, maturity_date, last_profit_calculated_at)
      VALUES (${decoded.userId}, ${amount}, ${dailyProfitRate}, ${days}, 'active', ${maturityDate.toISOString()}::timestamp, CURRENT_TIMESTAMP)
      RETURNING id, amount, daily_profit_rate, investment_days, total_profit, status, maturity_date, created_at
    `;

    // Không ghi lịch sử giao dịch cho đầu tư vì đây là chuyển tiền từ ví sang đầu tư
    // Lợi nhuận sẽ được ghi khi tính toán hàng ngày

    return NextResponse.json({
      message: 'Đầu tư thành công!',
        investment: {
          id: result[0].id,
          amount: parseFloat(result[0].amount.toString()),
          daily_profit_rate: parseFloat(result[0].daily_profit_rate.toString()),
          investment_days: result[0].investment_days || 1,
          total_profit: parseFloat(result[0].total_profit?.toString() || '0'),
          status: result[0].status,
          maturity_date: result[0].maturity_date,
          created_at: result[0].created_at,
        },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Create investment error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi tạo đầu tư' },
      { status: 500 }
    );
  }
}

