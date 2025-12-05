# 🔧 Fix: Role Đã Là Admin Nhưng Không Redirect

## 🔍 Nguyên Nhân

Khi bạn đã set role = `admin` trong database nhưng vẫn không redirect vào trang quản trị, vấn đề thường là:

1. **JWT Token vẫn còn role cũ** - Token đã được tạo với role `user`, cần tạo lại token với role `admin`
2. **Role có khoảng trắng hoặc case sensitive** - Database có thể lưu `'Admin'`, `'admin '`, `'ADMIN'` thay vì `'admin'`
3. **Cookie chưa được clear** - Browser vẫn giữ cookie cũ

## ✅ Giải Pháp Từng Bước

### **Bước 1: Kiểm Tra Role Trong Database**

Chạy SQL để kiểm tra role chính xác:

```sql
-- Kiểm tra role có khoảng trắng không
SELECT 
    id, 
    email, 
    name, 
    role,
    LENGTH(role) as role_length,
    role = 'admin' as is_strict_admin,
    LOWER(TRIM(role)) = 'admin' as is_lowercase_admin
FROM users 
WHERE email = 'admin@gmail.com';
```

**Nếu role không chính xác**, fix ngay:

```sql
-- Đảm bảo role = 'admin' (lowercase, không có khoảng trắng)
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';
```

### **Bước 2: Xóa Cookie Cũ và Đăng Nhập Lại**

Có 3 cách:

#### **Cách A: Dùng Debug Page (Khuyến nghị)**

1. Truy cập: `http://localhost:3000/debug-auth`
2. Xem thông tin chi tiết về token và role
3. Click "Đăng xuất và đăng nhập lại"

#### **Cách B: Clear Cookies Thủ Công**

1. Mở DevTools (F12)
2. Vào tab **Application** (Chrome) hoặc **Storage** (Firefox)
3. Click **Cookies** → Chọn domain của bạn
4. Tìm và xóa cookie `auth-token`
5. Đăng nhập lại

#### **Cách C: Đăng xuất qua UI**

1. Click nút "Đăng xuất" trong ứng dụng
2. Đăng nhập lại với `admin@gmail.com`
3. Kiểm tra xem có redirect vào `/admin` không

### **Bước 3: Kiểm Tra Token Mới**

Sau khi đăng nhập lại, kiểm tra:

1. Mở DevTools → Network tab
2. Đăng nhập
3. Tìm request `/api/auth/login`
4. Xem response, kiểm tra `user.role` phải là `'admin'`

Hoặc truy cập `/debug-auth` để xem token chi tiết.

## 🔎 Debug Chi Tiết

### Sử dụng Debug Page

Truy cập: `http://localhost:3000/debug-auth`

Trang này sẽ hiển thị:
- ✅ Role trong database
- ✅ Role trong JWT token
- ✅ So sánh role với `'admin'`
- ✅ Token payload đầy đủ
- ✅ API response

### Kiểm Tra Console Logs

Mở DevTools → Console và xem có lỗi gì không khi đăng nhập.

### Kiểm Tra Network Requests

1. Mở DevTools → Network
2. Đăng nhập
3. Kiểm tra:
   - `POST /api/auth/login` - Response có `user.role = 'admin'`?
   - `GET /api/auth/me` - Response có `user.role = 'admin'`?

## ⚠️ Các Vấn Đề Thường Gặp

### 1. Role có khoảng trắng

```sql
-- Kiểm tra
SELECT role, LENGTH(role) FROM users WHERE email = 'admin@gmail.com';
-- Nếu LENGTH > 5, có khoảng trắng

-- Fix
UPDATE users 
SET role = TRIM(LOWER(role))
WHERE email = 'admin@gmail.com';
```

### 2. Role là NULL

```sql
-- Kiểm tra
SELECT role FROM users WHERE email = 'admin@gmail.com';

-- Fix nếu NULL
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com' AND (role IS NULL OR role = '');
```

### 3. Case Sensitivity

```sql
-- Đảm bảo role là lowercase
UPDATE users 
SET role = LOWER(role)
WHERE email = 'admin@gmail.com';
```

### 4. Token vẫn giữ role cũ

**Giải pháp:** Bắt buộc phải đăng xuất và đăng nhập lại.

Nếu vẫn không được, thử:
1. Clear tất cả cookies
2. Clear browser cache
3. Đăng nhập lại

### 5. Logic redirect có vấn đề

Kiểm tra trong `app/login/page.tsx`:

```typescript
// Phải có logic này:
if (data.user?.role === 'admin') {
  router.push('/admin')
} else {
  router.push('/')
}
```

## 🎯 Checklist Hoàn Chỉnh

- [ ] Role trong database = `'admin'` (không có khoảng trắng, lowercase)
- [ ] Đã đăng xuất hoàn toàn
- [ ] Đã clear cookies (`auth-token`)
- [ ] Đã đăng nhập lại
- [ ] Response từ `/api/auth/login` có `user.role = 'admin'`
- [ ] Token mới có `role = 'admin'`
- [ ] Sau khi đăng nhập, redirect vào `/admin` ✅

## 🆘 Vẫn Không Được?

### 1. Kiểm tra lại database

```sql
-- Xem chính xác giá trị role
SELECT 
    id,
    email,
    role,
    CHAR_LENGTH(role) as length,
    ASCII(role) as first_char,
    role = 'admin' as equals_admin,
    role LIKE 'admin' as like_admin
FROM users 
WHERE email = 'admin@gmail.com';
```

### 2. Kiểm tra API response

```bash
# Test login API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@gmail.com", "password": "your_password"}' \
  -v
```

Xem response có `"role": "admin"` không.

### 3. Kiểm tra token

Decode JWT token và xem payload:
- Vào https://jwt.io
- Paste token
- Xem field `role` trong payload

### 4. Clear tất cả và thử lại

1. Đăng xuất
2. Clear all cookies và cache
3. Đóng và mở lại browser
4. Đăng nhập lại

---

**Nếu vẫn gặp vấn đề, hãy truy cập `/debug-auth` và gửi thông tin debug cho tôi!**

