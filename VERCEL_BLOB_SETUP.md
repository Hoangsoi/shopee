# Hướng dẫn Setup Vercel Blob Storage

## 1. Tạo Vercel Blob Store

1. Vào Vercel Dashboard
2. Chọn project của bạn
3. Vào **Storage** > **Create Database**
4. Chọn **Blob** (Vercel Blob Storage)
5. Đặt tên cho store (ví dụ: `dailyshopee-images`)
6. Chọn region gần nhất (ví dụ: `sin1` cho Singapore)

## 2. Lấy Blob Token

Sau khi tạo Blob store, Vercel sẽ tự động tạo token. Bạn cần:

1. Vào **Settings** > **Environment Variables**
2. Tìm biến `BLOB_READ_WRITE_TOKEN` (Vercel tự động thêm)
3. Hoặc tạo thủ công:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Token từ Vercel Blob store
   - **Environment**: Production, Preview, Development

## 3. Verify Setup

Sau khi thêm token, deploy lại project. Image upload sẽ tự động sử dụng Vercel Blob.

## 4. Fallback Behavior

- **Development**: Nếu Blob không khả dụng, sẽ fallback về base64
- **Production**: Yêu cầu `BLOB_READ_WRITE_TOKEN` phải được set

## 5. Pricing

Vercel Blob có free tier:
- 1 GB storage
- 1 GB bandwidth/month

Xem thêm: https://vercel.com/docs/storage/vercel-blob

## 6. Alternative: Cloudinary

Nếu muốn dùng Cloudinary thay vì Vercel Blob:

1. Đăng ký tài khoản Cloudinary (free tier có sẵn)
2. Lấy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Cài đặt: `npm install cloudinary`
4. Cập nhật `app/api/upload/image/route.ts` để sử dụng Cloudinary SDK

