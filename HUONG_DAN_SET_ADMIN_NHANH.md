# ⚡ Hướng Dẫn Set Admin Nhanh - Từ Database View

Dựa vào hình ảnh database bạn đang xem, đây là cách nhanh nhất để set role admin:

## 🎯 Cách 1: Click trực tiếp trong Database View (Nếu có thể edit)

1. **Tìm user với email `admin@gmail.com`** (hoặc email bạn muốn set admin)
2. **Click vào ô `role`** của user đó
3. **Thay đổi giá trị từ `user` thành `admin`**
4. **Lưu thay đổi**

## 🔧 Cách 2: Dùng SQL Editor trong Neon

### Bước 1: Mở SQL Editor
- Trong Neon Dashboard, click vào tab **SQL Editor**

### Bước 2: Chạy lệnh SQL

**Tìm user trước:**
```sql
SELECT id, email, name, role 
FROM users 
WHERE email LIKE '%admin%' OR email LIKE '%@gmail.com';
```

**Set role admin (thay `admin@gmail.com` bằng email thật của bạn):**
```sql
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';
```

**Kiểm tra lại:**
```sql
SELECT id, email, name, role 
FROM users 
ORDER BY id;
```

### Bước 3: Xác nhận
- Trong database view, refresh lại và kiểm tra cột `role` đã là `admin` chưa

## 📋 Xác định User Cần Set Admin

Từ database view, bạn cần:

1. **Tìm user có email = `admin@gmail.com`**
   - Scroll hoặc search trong database view
   - Xem cột email (có thể là cột đầu tiên `har(50)`)

2. **Kiểm tra role hiện tại**
   - Nếu role = `user` → Cần set thành `admin`
   - Nếu role = `admin` → Đã đúng rồi!

3. **Lưu ý về email**
   - Kiểm tra chính xác email (có thể bạn viết `admin@gmail,com` với dấu phẩy?)
   - Email đúng phải là: `admin@gmail.com` (dấu chấm)

## ⚡ Quick Fix - Copy & Paste SQL

Nếu bạn đang ở SQL Editor, copy và chạy đoạn này:

```sql
-- Tìm tất cả users và xem role
SELECT id, email, name, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- Set admin cho email cụ thể (THAY EMAIL Ở ĐÂY)
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL CỦA BẠN

-- Kiểm tra kết quả
SELECT id, email, name, role 
FROM users 
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL CỦA BẠN
```

## ✅ Sau Khi Set Admin

1. **Quay lại ứng dụng**
2. **Đăng xuất** (nếu đang đăng nhập)
3. **Đăng nhập lại** với email `admin@gmail.com`
4. **Tự động redirect vào `/admin/dashboard`** ✅

## 🔍 Nếu Vẫn Không Được

1. **Kiểm tra email chính xác:**
   ```sql
   SELECT id, email, name, role 
   FROM users;
   ```
   Xem email nào là của bạn, đảm bảo không có typo.

2. **Kiểm tra role đã update chưa:**
   ```sql
   SELECT id, email, role 
   FROM users 
   WHERE email = 'admin@gmail.com';
   ```
   Phải thấy `role = 'admin'`

3. **Clear cookies và đăng nhập lại:**
   - Mở DevTools (F12)
   - Application → Cookies
   - Xóa cookie `auth-token`
   - Đăng nhập lại

## 📝 Checklist

- [ ] Đã tìm thấy user với email của bạn trong database
- [ ] Đã set role = `admin` (không phải `user`)
- [ ] Đã đăng xuất
- [ ] Đã clear cookies
- [ ] Đã đăng nhập lại
- [ ] Tự động redirect vào `/admin/dashboard` ✅

---

**Tip:** Nếu bạn thấy trong database view có user với `wallet_balance = 941302093.30`, đó có thể là user bạn cần set admin. Kiểm tra email của user đó!

