# Hướng dẫn tạo các bảng trong Database

Có 3 cách để tạo tất cả các bảng trong database Neon:

## Cách 1: Chạy script Node.js (Khuyến nghị)

```bash
npm run setup-db
```

Hoặc:

```bash
npx tsx scripts/setup-all-tables.ts
```

Script này sẽ tự động:
- Tạo bảng `users`
- Tạo bảng `settings` và thêm mã đại lý mặc định
- Tạo bảng `categories` và thêm 5 danh mục mẫu
- Tạo bảng `products`
- Tạo tất cả các index cần thiết
- Hiển thị thống kê sau khi hoàn thành

## Cách 2: Chạy SQL trực tiếp trong Neon SQL Editor

1. Mở Neon Dashboard
2. Vào SQL Editor
3. Copy toàn bộ nội dung file `lib/complete-db-setup.sql`
4. Paste vào SQL Editor và chạy

File SQL này chứa:
- Tất cả các lệnh CREATE TABLE
- Các lệnh INSERT dữ liệu mẫu
- Các lệnh kiểm tra kết quả

## Cách 3: Sử dụng API Migration (Qua trình duyệt)

1. Đảm bảo ứng dụng đang chạy (npm run dev)
2. Truy cập: `http://localhost:3000/api/migrate-db`
3. Click nút "🚀 CHẠY MIGRATION"

API này sẽ tự động:
- Kiểm tra và tạo các bảng còn thiếu
- Thêm các cột mới nếu bảng đã tồn tại
- Tạo index và dữ liệu mẫu

## Các bảng được tạo

### 1. `users`
- Lưu thông tin người dùng
- Các cột: id, email, password, name, phone, agent_code, role, created_at, updated_at

### 2. `settings`
- Lưu các cài đặt hệ thống
- Các cột: id, key, value, description, updated_at
- Dữ liệu mẫu: `valid_agent_code = 'SH6688'`

### 3. `categories`
- Lưu danh mục sản phẩm
- Các cột: id, name, slug, discount_percent, icon, sort_order, is_active, created_at, updated_at
- Dữ liệu mẫu: 5 danh mục (Mỹ phẩm, Điện tử, Điện lạnh, Cao cấp, VIP)

### 4. `products`
- Lưu thông tin sản phẩm
- Các cột: id, name, slug, description, price, original_price, image_url, category_id, is_featured, is_active, stock, created_at, updated_at

## Kiểm tra kết quả

Sau khi chạy, bạn có thể kiểm tra bằng cách:

1. **Qua SQL Editor:**
```sql
-- Xem tất cả các bảng
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- Xem dữ liệu categories
SELECT * FROM categories;

-- Xem dữ liệu settings
SELECT * FROM settings;
```

2. **Qua API:**
- Truy cập: `http://localhost:3000/api/migrate-db` (GET) để xem trạng thái
- Truy cập: `http://localhost:3000/api/categories` để xem danh mục
- Truy cập: `http://localhost:3000/api/products` để xem sản phẩm

## Lưu ý

- Đảm bảo `DATABASE_URL` đã được cấu hình trong `.env.local`
- Nếu bảng đã tồn tại, script sẽ không ghi đè dữ liệu hiện có
- Các lệnh sử dụng `IF NOT EXISTS` và `ON CONFLICT DO NOTHING` để tránh lỗi

