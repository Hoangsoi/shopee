# Hướng dẫn Tự động Migration Database lên Neon

## Tổng quan

Hệ thống có 2 cách để tự động cập nhật database lên Neon:

1. **API Endpoint** - Chạy qua HTTP request (khuyến nghị cho production)
2. **Script TypeScript** - Chạy từ command line (khuyến nghị cho development)

## Cách 1: Sử dụng API Endpoint (Khuyến nghị)

### Local Development:
```bash
# Chạy dev server
npm run dev

# Trong terminal khác hoặc dùng Postman/curl
curl -X POST http://localhost:3000/api/migrate-db
```

### Production (Vercel):
```bash
# Sau khi deploy, gọi API migration
curl -X POST https://your-app.vercel.app/api/migrate-db
```

Hoặc mở trình duyệt và truy cập:
```
POST https://your-app.vercel.app/api/migrate-db
```

### Response mẫu:
```json
{
  "success": true,
  "message": "Migration database thành công!",
  "tables": {
    "users": {
      "columns": [...],
      "count": 8
    },
    "settings": {
      "columns": [...],
      "count": 4
    }
  },
  "currentAgentCode": "SH6688"
}
```

## Cách 2: Sử dụng Script TypeScript

### Cài đặt tsx (nếu chưa có):
```bash
npm install -D tsx
```

### Chạy migration:
```bash
npm run migrate
```

Hoặc:
```bash
npx tsx scripts/migrate-to-neon.ts
```

### Output mẫu:
```
🚀 Bắt đầu migration database lên Neon...

📦 Đang tạo/cập nhật bảng users...
  ✓ Đã thêm cột phone
  ✓ Đã thêm cột agent_code
  ✓ Index đã được tạo

📦 Đang tạo/cập nhật bảng settings...
  ✓ Bảng settings đã được tạo

🔍 Đang kiểm tra kết quả...

✅ Migration thành công!

📊 Bảng users có các cột:
   - id (integer)
   - email (character varying)
   - password (character varying)
   ...

✨ Database đã sẵn sàng!
```

## Các bảng và cột được tạo

### Bảng `users`:
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR 255, UNIQUE, NOT NULL)
- `password` (VARCHAR 255, NOT NULL)
- `name` (VARCHAR 255)
- `phone` (VARCHAR 20)
- `agent_code` (VARCHAR 50)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Index:**
- `idx_users_email` trên `email`
- `idx_users_phone` trên `phone`

### Bảng `settings`:
- `id` (SERIAL PRIMARY KEY)
- `key` (VARCHAR 100, UNIQUE, NOT NULL)
- `value` (TEXT, NOT NULL)
- `description` (TEXT)
- `updated_at` (TIMESTAMP)

**Dữ liệu mặc định:**
- `valid_agent_code` = `SH6688`

## Tính năng

✅ **Tự động phát hiện và thêm cột mới** - Nếu bảng đã tồn tại nhưng thiếu cột, sẽ tự động thêm
✅ **An toàn** - Không làm mất dữ liệu hiện có
✅ **Idempotent** - Có thể chạy nhiều lần mà không gây lỗi
✅ **Chi tiết** - Hiển thị đầy đủ thông tin về các bảng và cột đã tạo

## Lưu ý

- ⚠️ Đảm bảo `DATABASE_URL` trong `.env.local` đã được cấu hình đúng
- ⚠️ Migration sẽ tự động tạo các bảng và cột nếu chưa có
- ⚠️ Nếu bảng đã tồn tại, chỉ thêm các cột mới, không xóa dữ liệu cũ
- ✅ Có thể chạy migration nhiều lần an toàn

## Troubleshooting

### Lỗi kết nối database:
- Kiểm tra `DATABASE_URL` trong `.env.local`
- Đảm bảo Neon database đang hoạt động
- Kiểm tra network/firewall

### Lỗi permission:
- Đảm bảo user database có quyền CREATE TABLE và ALTER TABLE
- Kiểm tra connection string có đúng quyền không

### Lỗi cột đã tồn tại:
- Đây là lỗi bình thường, script sẽ bỏ qua và tiếp tục
- Kiểm tra log để xem các bước đã hoàn thành

