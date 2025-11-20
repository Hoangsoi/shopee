# Hướng dẫn điền Environment Variables trên Vercel

## Bước 1: Thêm Environment Variables

Trong phần **Environment Variables** trên Vercel, bạn cần thêm 2 biến sau:

### 1. DATABASE_URL
- **Key**: `DATABASE_URL`
- **Value**: `postgresql://neondb_owner:npg_NUwAnfov47CF@ep-misty-paper-a1v1vp6d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

### 2. JWT_SECRET
- **Key**: `JWT_SECRET`
- **Value**: `b7f2c9a8e4c1f0d3a6b19f47c2e85d10f3a1d8c7e9b0246f5c18a7d9e3f40b2`

## Cách thêm:

1. Click vào nút **"+ Add More"** (hoặc click vào ô trống nếu có)
2. Điền **Key** và **Value** cho từng biến
3. Lặp lại cho biến thứ 2

## Hoặc dùng Import .env:

1. Click nút **"Import .env"**
2. Copy nội dung từ file `.env.local` (bỏ comment):
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_NUwAnfov47CF@ep-misty-paper-a1v1vp6d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=b7f2c9a8e4c1f0d3a6b19f47c2e85d10f3a1d8c7e9b0246f5c18a7d9e3f40b2
   ```
3. Paste vào và import

## Sau khi thêm xong:

1. Kiểm tra lại 2 biến đã được thêm đúng
2. Click nút **"Deploy"** ở dưới cùng
3. Đợi Vercel build và deploy (thường mất 2-3 phút)

## Lưu ý:

- ✅ **DATABASE_URL**: Đảm bảo copy đầy đủ, không thiếu ký tự nào
- ✅ **JWT_SECRET**: Nên đổi thành một chuỗi ngẫu nhiên khác cho production (bảo mật hơn)
- ⚠️ Sau khi deploy, nhớ setup database bằng cách:
  - Vào Neon Dashboard và chạy SQL từ file `lib/db-setup.sql`
  - Hoặc truy cập: `https://your-app.vercel.app/api/auth/setup` (POST request)

