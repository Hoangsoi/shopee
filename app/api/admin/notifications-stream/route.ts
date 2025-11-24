import { NextRequest } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// Server-Sent Events endpoint cho real-time notifications
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return new Response('Unauthorized', { status: 403 });
    }

    // Tạo ReadableStream cho SSE
    const encoder = new TextEncoder();
    let isClosed = false;
    
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          // Kiểm tra xem controller đã đóng chưa
          if (isClosed) {
            return;
          }
          
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error: any) {
            // Controller đã đóng hoặc lỗi
            if (error?.code === 'ERR_INVALID_STATE' || error?.message?.includes('closed')) {
              isClosed = true;
              cleanup();
            }
          }
        };

        // Gửi keep-alive mỗi 30 giây
        let keepAliveInterval: NodeJS.Timeout | null = null;
        let updateInterval: NodeJS.Timeout | null = null;

        // Hàm lấy và gửi notifications
        const fetchAndSendNotifications = async () => {
          // Không gửi nếu đã đóng
          if (isClosed) {
            return;
          }

          try {
            // Đếm đơn hàng pending
            let pendingOrders = 0;
            try {
              const ordersCount = await sql`
                SELECT COUNT(*)::int as count 
                FROM orders 
                WHERE status = 'pending'
              `;
              pendingOrders = ordersCount[0]?.count || 0;
            } catch (error) {
              // Ignore
            }

            // Đếm lệnh rút tiền pending
            let pendingWithdrawals = 0;
            try {
              const withdrawalsCount = await sql`
                SELECT COUNT(*)::int as count 
                FROM transactions 
                WHERE status = 'pending' AND type = 'withdraw'
              `;
              pendingWithdrawals = withdrawalsCount[0]?.count || 0;
            } catch (error) {
              // Ignore
            }

            // Đếm khách đăng ký mới (24h)
            let newUsers = 0;
            try {
              const newUsersCount = await sql`
                SELECT COUNT(*)::int as count 
                FROM users 
                WHERE created_at >= NOW() - INTERVAL '24 hours' AND role = 'user'
              `;
              newUsers = newUsersCount[0]?.count || 0;
            } catch (error) {
              // Ignore
            }

            // Gửi data qua SSE (chỉ nếu chưa đóng)
            if (!isClosed) {
              const data = JSON.stringify({
                pendingOrders,
                pendingWithdrawals,
                newUsers,
                timestamp: Date.now(),
              });

              send(`data: ${data}\n\n`);
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching notifications:', error);
            }
          }
        };

        // Cleanup function
        const cleanup = () => {
          isClosed = true;
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
          }
          try {
            if (!isClosed) {
              controller.close();
            }
          } catch (error) {
            // Ignore - controller có thể đã đóng
          }
        };

        // Gửi notifications ngay lập tức
        await fetchAndSendNotifications();

        // Cập nhật mỗi 5 giây
        updateInterval = setInterval(() => {
          if (!isClosed) {
            fetchAndSendNotifications();
          } else {
            cleanup();
          }
        }, 5000);

        // Keep-alive mỗi 30 giây
        keepAliveInterval = setInterval(() => {
          if (!isClosed) {
            send(': keep-alive\n\n');
          } else {
            cleanup();
          }
        }, 30000);

        // Listen for abort signal
        if (request.signal) {
          request.signal.addEventListener('abort', cleanup);
        }

        // Cleanup khi stream bị đóng
        return () => {
          cleanup();
        };
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('SSE error:', error);
    }
    return new Response('Internal Server Error', { status: 500 });
  }
}

