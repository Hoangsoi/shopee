# Hướng dẫn Migration Database

## Tổng quan

Script migration này sẽ thêm 2 cột mới vào bảng `users`:
- `phone` (VARCHAR 20) - Số điện thoại
- `agent_code` (VARCHAR 50) - Mã đại lý

## Cách 1: Sử dụng API Migration (Khuyến nghị)

### Local Development:
```bash
# Chạy dev server
npm run dev

# Trong trình duyệt hoặc dùng curl/Postman
POST http://localhost:3000/api/migrate
```

### Production (Vercel):
```bash
# Sau khi deploy, gọi API migration
POST https://your-app.vercel.app/api/migrate
```

Hoặc dùng curl:
```bash
curl -X POST https://your-app.vercel.app/api/migrate
```

## Cách 2: Chạy SQL trực tiếp trong Neon Dashboard

1. Đăng nhập vào [Neon Dashboard](https://console.neon.tech)
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Copy và paste nội dung từ file `lib/migration-add-phone-agent.sql`
5. Click **Run** để thực thi

## Cách 3: Sử dụng API Setup (Tự động)

API `/api/auth/setup` đã được cập nhật để tự động thêm các cột mới nếu chưa có.

```bash
POST http://localhost:3000/api/auth/setup
```

## Kiểm tra Migration

Sau khi chạy migration, kiểm tra bằng cách:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('phone', 'agent_code')
ORDER BY column_name;
```

Hoặc gọi API:
```bash
GET http://localhost:3000/api/test-db
```

## Lưu ý

- ✅ Migration này **an toàn** - không làm mất dữ liệu hiện có
- ✅ Các cột mới sẽ có giá trị `NULL` cho các user cũ
- ✅ Migration có thể chạy nhiều lần mà không gây lỗi (idempotent)
- ⚠️ Nếu bảng `users` chưa tồn tại, hãy chạy `/api/auth/setup` trước

## Rollback (Nếu cần)

Nếu muốn xóa các cột mới (không khuyến nghị):

```sql
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS agent_code;
DROP INDEX IF EXISTS idx_users_phone;
```

