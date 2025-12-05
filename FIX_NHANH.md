# ⚡ FIX NHANH: Role Đã Là Admin Nhưng Không Redirect

## 🎯 Nguyên Nhân

JWT Token vẫn còn role cũ (`user`) dù database đã có role `admin`. Token cần được tạo lại.

## ✅ Fix Ngay (3 Bước)

### Bước 1: Kiểm tra và Fix Role trong Database

Chạy SQL này trong Neon SQL Editor:

```sql
-- Kiểm tra role
SELECT id, email, name, role, LENGTH(role) as length
FROM users 
WHERE email = 'admin@gmail.com';

-- Fix role (đảm bảo chính xác là 'admin')
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';
```

### Bước 2: Đăng xuất và Xóa Cookie

**Cách A: Dùng Debug Page (Dễ nhất)**

1. Truy cập: `http://localhost:3000/debug-auth`
2. Click nút **"Đăng xuất và đăng nhập lại"**

**Cách B: Thủ công**

1. Click nút "Đăng xuất" trong app
2. Mở DevTools (F12) → Application → Cookies
3. Xóa cookie `auth-token`

### Bước 3: Đăng nhập lại

1. Đăng nhập lại với `admin@gmail.com`
2. ✅ Tự động redirect vào `/admin/dashboard`

## 🔍 Debug Nếu Vẫn Không Được

### Sử dụng Debug Page

Truy cập: `http://localhost:3000/debug-auth`

Trang này sẽ cho bạn biết:
- ✅ Role trong database
- ✅ Role trong JWT token
- ✅ Vấn đề ở đâu

### Kiểm tra Role Có Khoảng Trắng

```sql
-- Xem role có khoảng trắng không
SELECT 
    email,
    role,
    LENGTH(role) as length,
    role = 'admin' as is_admin
FROM users 
WHERE email = 'admin@gmail.com';

-- Nếu length > 5, có khoảng trắng → Fix:
UPDATE users 
SET role = TRIM(LOWER(role))
WHERE email = 'admin@gmail.com';
```

## ⚠️ Lưu Ý Quan Trọng

1. **Bắt buộc phải đăng xuất và đăng nhập lại** sau khi set role admin
2. **Role phải chính xác là `'admin'`** (lowercase, không có khoảng trắng)
3. **Token cũ sẽ không tự động update**, phải tạo token mới

## 🎯 Checklist

- [ ] Role trong database = `'admin'` (đã kiểm tra)
- [ ] Đã đăng xuất
- [ ] Đã xóa cookie `auth-token`
- [ ] Đã đăng nhập lại
- [ ] Tự động redirect vào `/admin` ✅

---

**Nếu vẫn không được, hãy xem file `FIX_ADMIN_NOT_REDIRECTING.md` để có hướng dẫn chi tiết hơn!**

