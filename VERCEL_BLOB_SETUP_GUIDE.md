# Hướng dẫn Setup Vercel Blob Storage

## Bước 1: Tạo Blob Store

1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Click vào **Storage** ở sidebar bên trái
3. Click **Create Database** hoặc **Add Storage**
4. Chọn **Blob**
5. Đặt tên cho store (ví dụ: `shopee-blob`)
6. Chọn region (khuyến nghị: gần với server của bạn)
7. Click **Create**

## Bước 2: Lấy Read/Write Token

1. Sau khi tạo store, click vào store vừa tạo
2. Vào tab **Settings**
3. Tìm phần **Tokens** hoặc **Access Tokens**
4. Copy **Read/Write Token** (không phải Read-only token)

## Bước 3: Thêm Token vào Project

1. Vào Vercel Dashboard → Chọn project **shopee**
2. Vào **Settings** → **Environment Variables**
3. Click **Add New**
4. Điền thông tin:
   - **Key**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: (paste token đã copy ở bước 2)
   - **Environment**: Chọn tất cả (Production, Preview, Development)
5. Click **Save**

## Bước 4: Connect Blob Store với Project

1. Vào **Storage** → Chọn Blob store của bạn
2. Vào tab **Projects**
3. Click **Connect Project**
4. Chọn project **shopee**
5. Xác nhận

## Bước 5: Redeploy

**Quan trọng:** Sau khi thêm environment variable, bạn PHẢI redeploy:

1. Vào **Deployments**
2. Click vào 3 chấm (⋯) trên deployment mới nhất
3. Chọn **Redeploy**
4. Hoặc push một commit mới lên GitHub để trigger auto-deploy

## Bước 6: Verify Setup

Sau khi redeploy, test bằng cách:

1. Truy cập: `https://your-domain.vercel.app/api/test-blob`
2. Nếu thành công, bạn sẽ thấy:
   ```json
   {
     "success": true,
     "message": "Vercel Blob hoạt động bình thường!",
     "hasToken": true,
     "testUrl": "https://..."
   }
   ```

## Troubleshooting

### Lỗi: "BLOB_READ_WRITE_TOKEN chưa được cấu hình"
- **Nguyên nhân**: Token chưa được thêm hoặc chưa redeploy
- **Giải pháp**: 
  1. Kiểm tra lại Environment Variables trong Vercel
  2. Đảm bảo đã chọn đúng environments (Production, Preview, Development)
  3. Redeploy lại project

### Lỗi: "Invalid token" hoặc "Unauthorized"
- **Nguyên nhân**: Token không đúng hoặc đã hết hạn
- **Giải pháp**: 
  1. Tạo token mới trong Blob store Settings
  2. Cập nhật lại Environment Variable
  3. Redeploy

### Ảnh vẫn lưu base64 sau khi setup
- **Nguyên nhân**: 
  1. Ảnh được tạo trước khi setup token
  2. Code đang fallback về base64 do lỗi upload
- **Giải pháp**: 
  1. Dùng button "🔄 Migrate ảnh lên Blob" để migrate ảnh cũ
  2. Upload ảnh mới sẽ tự động lên Vercel Blob

## Lưu ý

- Token chỉ có hiệu lực sau khi **redeploy**
- Mỗi Blob store có token riêng
- Token có thể bị revoke nếu bạn xóa store hoặc regenerate token
- Nên giữ token an toàn, không commit vào Git

