# Hướng dẫn nhanh: Trigger Vercel Deployment

## Vấn đề
Code mới nhất đã push lên GitHub nhưng Vercel chưa tự động deploy.

## Giải pháp nhanh nhất:

### Bước 1: Vào Vercel Dashboard
https://vercel.com/hoangs-projects-fc4b673f/shopeedaily

### Bước 2: Trigger Deployment thủ công
1. Click vào tab **"Deployments"** (ở thanh menu trên)
2. Tìm deployment mới nhất (commit `f82af99` hoặc mới hơn)
3. Nếu chưa có deployment mới:
   - Click nút **"..."** (3 chấm) ở góc phải trên
   - Chọn **"Redeploy"**
   - **Bỏ chọn** "Use existing Build Cache"
   - Click **"Redeploy"**

### Bước 3: Kiểm tra Build
1. Click vào deployment đang build
2. Xem tab **"Build Logs"** để theo dõi quá trình
3. Đợi build hoàn tất (thường 2-3 phút)

### Bước 4: Kiểm tra kết quả
Sau khi build xong, truy cập:
- https://dailyshopee.vercel.app/login
- Kiểm tra xem đã hiển thị "Đại Lý Shopee" chưa

## Nếu vẫn không deploy được:

### Kiểm tra Git Integration
1. Vào **Settings** → **Git**
2. Kiểm tra xem GitHub connection có hoạt động không
3. Nếu có lỗi:
   - Click **"Disconnect"**
   - Click **"Connect Git Repository"**
   - Chọn lại repository `Hoangsoi/shopee`
   - Chọn branch `main`
   - Vercel sẽ tự động setup lại webhook

### Kiểm tra Environment Variables
Đảm bảo đã set:
- `DATABASE_URL`
- `JWT_SECRET`

## Commit mới nhất
- `f82af99` - Trigger Vercel deployment
- `d3a3281` - Add role-based authentication, admin page, and database migration system

## Lưu ý
- Vercel thường tự động deploy trong 1-2 phút sau khi push
- Nếu không tự động, trigger thủ công như hướng dẫn trên
- Sau khi deploy, có thể cần hard refresh (Ctrl+F5) để xem thay đổi

