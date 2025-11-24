# Hướng dẫn Debug Vercel Blob Upload

## Vấn đề: Ảnh không được upload lên Vercel Blob

Nếu bạn đã cập nhật ảnh banner/sản phẩm nhưng không thấy trong Vercel Blob storage, có thể do các nguyên nhân sau:

## 1. Kiểm tra BLOB_READ_WRITE_TOKEN

### Trong Vercel Dashboard:
1. Vào **Settings** → **Environment Variables**
2. Kiểm tra xem có biến `BLOB_READ_WRITE_TOKEN` không
3. Nếu chưa có, cần thêm token từ Vercel Blob

### Cách lấy token:
1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project của bạn
3. Vào **Storage** → **Blob**
4. Tạo Blob store mới hoặc chọn store hiện có
5. Vào **Settings** của store → Copy **Read/Write Token**
6. Thêm vào Environment Variables với tên `BLOB_READ_WRITE_TOKEN`

## 2. Kiểm tra Logs

### Trong Vercel Dashboard:
1. Vào **Deployments** → Chọn deployment mới nhất
2. Vào **Functions** → Tìm `/api/upload/image` hoặc `/api/admin/banners`
3. Xem logs để kiểm tra:
   - `✅ Uploaded image to Vercel Blob: ...` - Upload thành công
   - `⚠️ BLOB_READ_WRITE_TOKEN not set` - Thiếu token
   - `❌ Vercel Blob upload failed: ...` - Upload thất bại

## 3. Cách hoạt động

### Khi upload file:
1. User chọn file → `ImageUpload` component
2. Convert file thành base64
3. Gọi `/api/upload/image` với base64
4. API upload lên Vercel Blob (nếu có token)
5. Trả về URL từ Vercel Blob
6. Frontend lưu URL vào database

### Khi paste base64:
1. User paste base64 vào input
2. `ImageUpload` component tự động gọi `/api/upload/image`
3. API upload lên Vercel Blob (nếu có token)
4. Trả về URL từ Vercel Blob
5. Frontend lưu URL vào database

### Khi paste URL:
1. User paste URL vào input
2. Không cần upload, lưu trực tiếp URL vào database

## 4. Fallback Behavior

- **Nếu không có `BLOB_READ_WRITE_TOKEN`**: 
  - Base64 sẽ được lưu trực tiếp vào database
  - Không upload lên Vercel Blob
  - Ảnh vẫn hiển thị được nhưng không tối ưu

- **Nếu upload fail**:
  - Trong development: Fallback về base64
  - Trong production: Có thể fail hoặc fallback tùy cấu hình

## 5. Kiểm tra trong Database

Để kiểm tra xem ảnh đã được upload hay chưa:

```sql
-- Kiểm tra banners
SELECT id, image_url, 
  CASE 
    WHEN image_url LIKE 'https://%' THEN 'URL (Vercel Blob)'
    WHEN image_url LIKE 'data:image/%' THEN 'Base64'
    ELSE 'Unknown'
  END as image_type
FROM banners
ORDER BY updated_at DESC
LIMIT 10;

-- Kiểm tra products
SELECT id, name, image_url,
  CASE 
    WHEN image_url LIKE 'https://%' THEN 'URL (Vercel Blob)'
    WHEN image_url LIKE 'data:image/%' THEN 'Base64'
    ELSE 'Unknown'
  END as image_type
FROM products
ORDER BY updated_at DESC
LIMIT 10;
```

## 6. Giải pháp

### Nếu ảnh đang là base64:
1. Đảm bảo `BLOB_READ_WRITE_TOKEN` đã được set trong Vercel
2. Redeploy ứng dụng để áp dụng biến môi trường mới
3. Cập nhật lại ảnh (chọn file mới hoặc paste base64 mới)
4. Kiểm tra logs để xem upload có thành công không

### Nếu vẫn không upload:
1. Kiểm tra logs trong Vercel để xem lỗi cụ thể
2. Đảm bảo token đúng và có quyền Read/Write
3. Kiểm tra xem Blob store có tồn tại không
4. Thử upload ảnh mới để test

## 7. Test Upload

### Test nhanh với endpoint test:
1. Truy cập `/api/test-blob` (phải đăng nhập admin)
2. Endpoint này sẽ:
   - Kiểm tra xem `BLOB_READ_WRITE_TOKEN` có được set không
   - Thử upload một file test nhỏ lên Vercel Blob
   - Trả về kết quả và URL của file test

### Test upload ảnh thực tế:
1. Vào trang `/admin/banners` hoặc `/admin/products`
2. Chọn ảnh mới hoặc paste base64
3. Lưu
4. Kiểm tra console logs trong browser
5. Kiểm tra Vercel logs (Deployments → Functions → `/api/upload/image` hoặc `/api/admin/banners`)
6. Kiểm tra Vercel Blob storage (Storage → Browser)

## 8. Quan trọng: Redeploy sau khi thêm token

**Nếu bạn vừa thêm `BLOB_READ_WRITE_TOKEN` vào Vercel:**
1. **Phải redeploy** ứng dụng để token có hiệu lực
2. Vào Vercel Dashboard → Deployments
3. Click "Redeploy" hoặc push code mới lên GitHub
4. Sau khi deploy xong, thử upload ảnh lại

**Lưu ý:** Token chỉ có hiệu lực sau khi redeploy, không tự động apply cho các deployment cũ.

