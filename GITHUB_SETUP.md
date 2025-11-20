# Hướng dẫn đẩy code lên GitHub

## Bước 1: Tạo repository trên GitHub

1. Đăng nhập vào [GitHub](https://github.com)
2. Click vào dấu **+** ở góc trên bên phải, chọn **New repository**
3. Điền thông tin:
   - **Repository name**: `dailyshopee` (hoặc tên bạn muốn)
   - **Description**: "DailyShopee - Authentication system with Next.js and Neon PostgreSQL"
   - Chọn **Public** hoặc **Private**
   - **KHÔNG** tích vào "Initialize this repository with a README" (vì đã có code)
4. Click **Create repository**

## Bước 2: Kết nối và push code lên GitHub

Sau khi tạo repository, GitHub sẽ hiển thị các lệnh. Chạy các lệnh sau (thay `YOUR_USERNAME` bằng username GitHub của bạn):

```bash
# Thêm remote repository
git remote add origin https://github.com/YOUR_USERNAME/dailyshopee.git

# Đổi tên branch thành main (nếu GitHub yêu cầu)
git branch -M main

# Push code lên GitHub
git push -u origin main
```

Hoặc nếu bạn dùng SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/dailyshopee.git
git branch -M main
git push -u origin main
```

## Bước 3: Xác nhận

Sau khi push thành công, vào repository trên GitHub để xác nhận code đã được upload.

## Lưu ý quan trọng

✅ File `.env.local` đã được thêm vào `.gitignore` nên sẽ **KHÔNG** bị push lên GitHub (bảo mật thông tin database)

⚠️ Khi deploy lên Vercel, nhớ thêm các biến môi trường:
- `DATABASE_URL`
- `JWT_SECRET`

