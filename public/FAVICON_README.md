# Hướng dẫn thêm Favicon Shopee

## Cách thêm favicon:

1. **Tải logo Shopee** (file .ico hoặc .png)
   - Kích thước khuyến nghị: 32x32px hoặc 16x16px cho .ico
   - Hoặc 180x180px cho apple-touch-icon.png

2. **Đặt các file vào thư mục `public/`:**
   - `favicon.ico` - Favicon chính
   - `icon.svg` - Icon SVG (tùy chọn, cho chất lượng tốt hơn)
   - `apple-icon.png` - Icon cho iOS (180x180px)

3. **Hoặc đặt trực tiếp vào thư mục `app/`:**
   - `icon.ico` hoặc `favicon.ico` - Next.js sẽ tự động nhận diện

## Lưu ý:
- File favicon.ico sẽ được tự động phục vụ tại `/favicon.ico`
- Next.js 14 tự động nhận diện file `icon.ico` hoặc `favicon.ico` trong thư mục `app/`
- Nếu đặt trong `public/`, cần đảm bảo đường dẫn đúng trong metadata

## Sau khi thêm file:
- Refresh trình duyệt (Ctrl+F5 hoặc Cmd+Shift+R để xóa cache)
- Favicon sẽ hiển thị trên tab trình duyệt

