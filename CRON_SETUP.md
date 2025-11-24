# Hướng dẫn Setup Cron Job

## 1. Setup trong Vercel

### Bước 1: Thêm biến môi trường CRON_SECRET

1. Vào Vercel Dashboard
2. Chọn project của bạn
3. Vào **Settings** > **Environment Variables**
4. Thêm biến môi trường mới:
   - **Name**: `CRON_SECRET`
   - **Value**: Tạo một chuỗi ngẫu nhiên mạnh (ví dụ: `openssl rand -hex 32`)
   - **Environment**: Production, Preview, Development (tùy chọn)

### Bước 2: Verify Cron Job Configuration

File `vercel.json` đã được cấu hình với:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-investments",
      "schedule": "0 * * * *"
    }
  ]
}
```

Schedule `"0 * * * *"` có nghĩa là chạy mỗi giờ. Bạn có thể thay đổi:
- `"0 * * * *"` - Mỗi giờ
- `"*/15 * * * *"` - Mỗi 15 phút
- `"0 0 * * *"` - Mỗi ngày lúc 00:00
- `"0 */6 * * *"` - Mỗi 6 giờ

### Bước 3: Deploy và Verify

1. Deploy lại project lên Vercel
2. Vào **Settings** > **Cron Jobs** trong Vercel Dashboard
3. Kiểm tra xem cron job đã được tạo chưa
4. Có thể test bằng cách gọi endpoint thủ công:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
        https://your-domain.vercel.app/api/cron/process-investments
   ```

## 2. Sử dụng External Cron Service (Optional)

Nếu muốn dùng external cron service (như cron-job.org, EasyCron), bạn có thể:

1. Tạo một URL với secret:
   ```
   https://your-domain.vercel.app/api/cron/process-investments?secret=YOUR_CRON_SECRET
   ```

2. Hoặc gửi header:
   ```
   Authorization: Bearer YOUR_CRON_SECRET
   ```

## 3. Monitoring và Logs

- Logs sẽ xuất hiện trong Vercel Dashboard > **Logs**
- Cron job sẽ log:
  - Số lượng đầu tư đã xử lý
  - Tổng tiền đã hoàn lại
  - Thời gian thực thi
  - Lỗi (nếu có)

## 4. Troubleshooting

### Cron job không chạy
- Kiểm tra `vercel.json` có đúng format không
- Kiểm tra biến môi trường `CRON_SECRET` đã được set chưa
- Xem logs trong Vercel Dashboard

### Lỗi Unauthorized
- Đảm bảo `CRON_SECRET` đã được set trong Vercel
- Kiểm tra secret key có đúng không

### Cron job chạy nhưng không xử lý đầu tư
- Kiểm tra database có đầu tư đáo hạn không
- Xem logs để biết chi tiết lỗi

