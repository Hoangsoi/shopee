# 🔧 Hướng Dẫn Fix: Admin Không Được Redirect Vào Trang Quản Trị

## 🔍 Nguyên Nhân

Khi bạn tạo tài khoản mới (kể cả với email `admin@gmail.com`), hệ thống **mặc định** sẽ tạo user với `role = 'user'`. 

- ❌ **User thường** (`role = 'user'`): Chỉ được redirect vào trang chủ `/`
- ✅ **Admin** (`role = 'admin'`): Mới được redirect vào trang admin `/admin`

Vì vậy, sau khi tạo tài khoản, bạn cần **set role thành admin** để có quyền truy cập trang quản trị.

---

## ✅ Các Cách Set Role Admin

### **Cách 1: Sử dụng Script (Khuyến nghị - Nhanh nhất)**

#### Bước 1: Chạy script set admin

```bash
# Set admin bằng email
npm run set-admin admin@gmail.com

# Hoặc bằng ID
npm run set-admin 1

# Hoặc dùng tsx trực tiếp
tsx scripts/set-admin.ts admin@gmail.com
```

#### Bước 2: Đăng xuất và đăng nhập lại

Sau khi set admin, bạn **bắt buộc** phải:
1. Đăng xuất khỏi tài khoản
2. Đăng nhập lại

Lý do: JWT token đã được tạo với role cũ, cần tạo token mới với role admin.

---

### **Cách 2: Chạy SQL trực tiếp trong Neon Dashboard**

#### Bước 1: Đăng nhập Neon Dashboard

1. Truy cập [Neon Dashboard](https://console.neon.tech)
2. Chọn database của bạn
3. Vào **SQL Editor**

#### Bước 2: Chạy lệnh SQL

```sql
-- Kiểm tra user hiện tại
SELECT id, email, name, role FROM users WHERE email = 'admin@gmail.com';

-- Set role admin cho user theo email
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';

-- Hoặc set theo ID
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Kiểm tra lại
SELECT id, email, name, role FROM users WHERE email = 'admin@gmail.com';
```

#### Bước 3: Đăng xuất và đăng nhập lại

---

### **Cách 3: Sử dụng API (Nếu đã có admin khác)**

Nếu bạn đã có một admin khác đang đăng nhập, có thể dùng API:

```bash
# Set admin bằng email (cần đăng nhập với tài khoản admin)
curl -X POST http://localhost:3000/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_ADMIN_TOKEN" \
  -d '{"email": "admin@gmail.com"}'

# Hoặc bằng userId
curl -X POST http://localhost:3000/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_ADMIN_TOKEN" \
  -d '{"userId": 1}'
```

⚠️ **Lưu ý:** Cách này yêu cầu bạn đã có một admin khác đang đăng nhập.

---

## 🔎 Kiểm Tra Role Hiện Tại

### Kiểm tra trong Database

```sql
-- Xem tất cả users và role của họ
SELECT id, email, name, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- Kiểm tra user cụ thể
SELECT id, email, name, role 
FROM users 
WHERE email = 'admin@gmail.com';
```

### Kiểm tra qua API (sau khi đăng nhập)

```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

Response sẽ có:
```json
{
  "user": {
    "id": 1,
    "email": "admin@gmail.com",
    "name": "Admin",
    "role": "admin"  // <-- Kiểm tra giá trị này
  }
}
```

---

## ⚠️ Các Vấn Đề Thường Gặp

### 1. **Vẫn không redirect vào admin sau khi set role**

**Nguyên nhân:** Chưa đăng xuất và đăng nhập lại.

**Giải pháp:**
1. Đăng xuất hoàn toàn
2. Xóa cookies (F12 → Application → Cookies → Xóa `auth-token`)
3. Đăng nhập lại

### 2. **Email có typo**

Kiểm tra lại email của bạn:
- ❌ `admin@gmail,com` (có dấu phẩy)
- ✅ `admin@gmail.com` (dấu chấm)

### 3. **Role trong database là NULL**

Nếu role là `NULL`, hãy update:

```sql
-- Set role mặc định cho tất cả user có role NULL
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- Sau đó set admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@gmail.com';
```

### 4. **Cột role chưa tồn tại**

Nếu bảng users chưa có cột `role`, hãy thêm:

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';

-- Sau đó set admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@gmail.com';
```

---

## 🔄 Quy Trình Hoàn Chỉnh

### Lần đầu tạo admin:

1. ✅ Tạo tài khoản với email `admin@gmail.com` (qua form đăng ký)
2. ✅ Chạy script set admin: `npm run set-admin admin@gmail.com`
3. ✅ Đăng xuất (nếu đã đăng nhập)
4. ✅ Đăng nhập lại với `admin@gmail.com`
5. ✅ Tự động redirect vào `/admin/dashboard` ✅

### Tạo admin thêm (đã có admin):

1. ✅ Tài khoản admin hiện tại set role admin cho user mới (qua admin panel)
2. ✅ User mới đăng xuất và đăng nhập lại

---

## 📋 Checklist

Sau khi set admin, hãy kiểm tra:

- [ ] Role trong database = `'admin'` (không phải `'user'` hay `NULL`)
- [ ] Đã đăng xuất khỏi tài khoản
- [ ] Đã đăng nhập lại
- [ ] Sau khi đăng nhập, tự động redirect vào `/admin/dashboard`
- [ ] Có thể truy cập các trang admin (`/admin/users`, `/admin/products`, ...)

---

## 🆘 Vẫn Không Được?

Nếu vẫn gặp vấn đề, hãy kiểm tra:

1. **Console logs:** Mở F12 → Console xem có lỗi gì không
2. **Network tab:** Kiểm tra response từ `/api/auth/login` và `/api/auth/me`
3. **Role trong database:** Chạy SQL để xác nhận role = 'admin'
4. **Token:** Kiểm tra JWT token có chứa role 'admin' không

Nếu cần hỗ trợ thêm, hãy cung cấp:
- Email của tài khoản
- Role hiện tại trong database
- Console logs hoặc Network errors

---

**Tài liệu này được tạo để giải quyết vấn đề admin không được redirect vào trang quản trị.**

