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
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            // Client đã disconnect
            controller.close();
          }
        };

        // Gửi keep-alive mỗi 30 giây
        const keepAliveInterval = setInterval(() => {
          send(': keep-alive\n\n');
        }, 30000);

        // Hàm lấy và gửi notifications
        const fetchAndSendNotifications = async () => {
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

            // Gửi data qua SSE
            const data = JSON.stringify({
              pendingOrders,
              pendingWithdrawals,
              newUsers,
              timestamp: Date.now(),
            });

            send(`data: ${data}\n\n`);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching notifications:', error);
            }
          }
        };

        // Gửi notifications ngay lập tức
        await fetchAndSendNotifications();

        // Cập nhật mỗi 5 giây
        const updateInterval = setInterval(() => {
          fetchAndSendNotifications();
        }, 5000);

        // Cleanup khi client disconnect
        const cleanup = () => {
          clearInterval(keepAliveInterval);
          clearInterval(updateInterval);
          try {
            controller.close();
          } catch (error) {
            // Ignore
          }
        };

        // Listen for abort signal
        if (request.signal) {
          request.signal.addEventListener('abort', cleanup);
        }

        // Also cleanup on stream close
        return cleanup;
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

