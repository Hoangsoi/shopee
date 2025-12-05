# 🔐 Hướng Dẫn Đăng Nhập Và Kiểm Tra Admin

## 📊 Từ Trang Debug

Trang debug cho thấy:
- ❌ **Chưa đăng nhập** - API trả về `{"error": "Chưa đăng nhập"}`
- Email: N/A
- Role: undefined

**Vấn đề:** Bạn cần đăng nhập trước để kiểm tra role admin.

## ✅ Các Bước Thực Hiện

### Bước 1: Đăng Nhập

1. **Truy cập trang đăng nhập:**
   - Đi đến: `http://localhost:3000/login`
   - Hoặc click link "Đăng nhập" trong app

2. **Nhập thông tin:**
   - Email: `admin@gmail.com` (hoặc email bạn đã set admin)
   - Password: Mật khẩu của bạn

3. **Click "ĐĂNG NHẬP"**

### Bước 2: Kiểm Tra Redirect

Sau khi đăng nhập:

- ✅ **Nếu role = 'admin':** Tự động redirect vào `/admin/dashboard`
- ❌ **Nếu role = 'user':** Redirect vào `/` (trang chủ)

### Bước 3: Kiểm Tra Lại Trang Debug

Sau khi đăng nhập, quay lại trang debug:

1. Truy cập: `http://localhost:3000/debug-auth`
2. Xem thông tin:
   - ✅ Email: Phải hiển thị email của bạn
   - ✅ Role: Phải hiển thị `admin` (nếu đã set)
   - ✅ Is Admin?: Phải là **YES**

## 🔍 Nếu Vẫn Không Redirect Vào Admin

### Trường hợp 1: Role vẫn là 'user'

**Trong trang debug bạn sẽ thấy:**
- Role (raw): `"user"`
- Is Admin? (strict): ❌ NO

**Giải pháp:**
1. Set role admin trong database (đã hướng dẫn ở trên)
2. Đăng xuất
3. Đăng nhập lại

### Trường hợp 2: Role là 'admin' nhưng không redirect

**Trong trang debug bạn sẽ thấy:**
- Role (raw): `"admin"`
- Is Admin? (strict): ✅ YES
- Nhưng token role vẫn là 'user'

**Giải pháp:**
1. Click nút **"Đăng xuất và đăng nhập lại"** trong trang debug
2. Hoặc đăng xuất thủ công và đăng nhập lại

### Trường hợp 3: Role có khoảng trắng hoặc case sai

**Trong trang debug bạn sẽ thấy:**
- Role (raw): `"Admin"` hoặc `"admin "` (có khoảng trắng)
- Role Comparison Tests: Một số sẽ fail

**Giải pháp:**
1. Fix role trong database:
```sql
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';
```
2. Đăng xuất và đăng nhập lại

## 📋 Checklist Đầy Đủ

### Trước khi đăng nhập:
- [ ] Đã set role = `'admin'` trong database
- [ ] Đã verify role trong database bằng SQL

### Sau khi đăng nhập:
- [ ] Trang debug hiển thị email của bạn (không phải N/A)
- [ ] Trang debug hiển thị role = `"admin"` (không phải undefined)
- [ ] Is Admin? (strict) = ✅ YES
- [ ] Tự động redirect vào `/admin/dashboard` ✅

### Nếu không redirect:
- [ ] Đã kiểm tra trang debug
- [ ] Đã đăng xuất hoàn toàn
- [ ] Đã xóa cookie `auth-token`
- [ ] Đã đăng nhập lại
- [ ] Đã refresh trang

## 🎯 Luồng Hoàn Chỉnh

```
1. Set role admin trong database
   ↓
2. Đăng nhập với email admin@gmail.com
   ↓
3. Kiểm tra redirect:
   - Nếu → /admin/dashboard ✅ Thành công!
   - Nếu → / (trang chủ) ❌ Vấn đề
   ↓
4. Nếu không redirect vào admin:
   - Mở /debug-auth
   - Kiểm tra role
   - Đăng xuất và đăng nhập lại
   ↓
5. Lặp lại từ bước 2
```

## 🆘 Vẫn Không Được?

Nếu sau khi đăng nhập và kiểm tra debug page vẫn có vấn đề, hãy:

1. **Chụp màn hình trang debug** (sau khi đã đăng nhập)
2. **Chụp màn hình database** (role của user)
3. **Mô tả chi tiết:**
   - Sau khi đăng nhập, redirect đến đâu?
   - Role trong debug page là gì?
   - Role trong database là gì?

---

**Bắt đầu từ Bước 1: Đăng nhập vào hệ thống!**

