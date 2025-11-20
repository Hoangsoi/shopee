# Hướng dẫn Set Role Admin cho User

## Cách 1: Sử dụng API (Khuyến nghị)

### Set admin bằng userId:
```bash
curl -X POST http://localhost:3000/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'
```

### Set admin bằng email:
```bash
curl -X POST http://localhost:3000/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com"}'
```

## Cách 2: Chạy SQL trực tiếp trong Neon Dashboard

1. Đăng nhập vào [Neon Dashboard](https://console.neon.tech)
2. Vào SQL Editor
3. Chạy lệnh sau (thay email bằng email của bạn):

```sql
-- Set role admin cho user theo email
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'your-email@example.com';

-- Hoặc set theo ID
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

## Cách 3: Tạo user admin ngay từ đầu

Khi đăng ký, có thể chạy SQL để set role admin:

```sql
-- Sau khi đăng ký, set role admin
UPDATE users 
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## Kiểm tra role

```sql
SELECT id, email, name, role FROM users;
```

## Lưu ý

- ⚠️ Mặc định tất cả user mới sẽ có `role = 'user'`
- ⚠️ Chỉ user có `role = 'admin'` mới truy cập được `/admin`
- ⚠️ User thường sẽ bị redirect về trang chủ `/` nếu cố truy cập `/admin`
- ✅ Sau khi set role admin, user cần đăng xuất và đăng nhập lại để có hiệu lực

## Phân quyền

- **User thường (`role = 'user'`):**
  - Truy cập trang chủ `/`
  - Không thể truy cập `/admin`
  - Tự động redirect về `/` nếu cố truy cập `/admin`

- **Admin (`role = 'admin'`):**
  - Truy cập trang admin `/admin`
  - Quản lý mã đại lý
  - Tự động redirect về `/admin` khi đăng nhập
  - Tự động redirect về `/admin` khi truy cập `/`

