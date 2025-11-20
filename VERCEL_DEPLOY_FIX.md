# Hướng dẫn Fix Vercel không tự động deploy

## Vấn đề
Vercel không tự động detect commit mới và deploy.

## Giải pháp

### Cách 1: Trigger deployment thủ công (Nhanh nhất)

1. Vào Vercel Dashboard: https://vercel.com
2. Chọn project `shopeedaily`
3. Vào tab **"Deployments"**
4. Click nút **"Redeploy"** hoặc **"Deploy"** ở deployment mới nhất
5. Chọn **"Use existing Build Cache"** = No (để build lại từ đầu)
6. Click **"Redeploy"**

### Cách 2: Kiểm tra và sửa Webhook

1. Vào **Settings** → **Git**
2. Kiểm tra xem GitHub integration có đang hoạt động không
3. Nếu có lỗi, click **"Disconnect"** và **"Connect Git Repository"** lại
4. Chọn repository `Hoangsoi/shopee`
5. Vercel sẽ tự động setup webhook

### Cách 3: Push một commit mới để trigger

```bash
# Tạo một commit trống để trigger deployment
git commit --allow-empty -m "Trigger Vercel deployment"
git push
```

### Cách 4: Kiểm tra GitHub Webhook

1. Vào GitHub repository: https://github.com/Hoangsoi/shopee
2. Vào **Settings** → **Webhooks**
3. Kiểm tra xem có webhook từ Vercel không
4. Nếu không có, Vercel sẽ tự tạo khi bạn reconnect

### Cách 5: Deploy từ Vercel CLI (Nếu đã cài)

```bash
# Cài Vercel CLI (nếu chưa có)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Kiểm tra Deployment

Sau khi trigger deployment:

1. Vào tab **"Deployments"** trên Vercel
2. Xem deployment mới nhất
3. Kiểm tra commit hash phải là `d3a3281` (commit mới nhất)
4. Đợi build hoàn tất (thường 2-3 phút)

## Lưu ý

- ⚠️ Đảm bảo branch `main` trên GitHub đã có commit mới
- ⚠️ Kiểm tra Environment Variables đã được set đúng chưa
- ✅ Sau khi deploy, kiểm tra URL: `https://dailyshopee.vercel.app`

## Troubleshooting

Nếu vẫn không deploy được:

1. Kiểm tra Build Logs để xem lỗi
2. Kiểm tra Runtime Logs
3. Xem có lỗi trong GitHub Actions không
4. Thử disconnect và reconnect Git repository

