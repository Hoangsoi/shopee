# 📱 Hướng dẫn Build APK - Từng bước chi tiết

## Phương pháp 1: Sử dụng Android Studio (Dễ nhất - Khuyến nghị)

### Bước 1: Tải và cài đặt Android Studio
1. Truy cập: https://developer.android.com/studio
2. Tải Android Studio về
3. Cài đặt (Next > Next > Finish)

### Bước 2: Mở project trong Android Studio
1. Mở Android Studio
2. Click **"Open"** hoặc **File > Open**
3. Chọn thư mục `android-app` (thư mục chứa file build.gradle)
4. Click **"OK"**

### Bước 3: Đợi Gradle Sync
- Android Studio sẽ tự động sync project
- Đợi đến khi thấy "Gradle sync finished" ở dưới cùng
- Có thể mất 5-10 phút lần đầu tiên

### Bước 4: Build APK
1. Click menu **"Build"** ở trên cùng
2. Chọn **"Build Bundle(s) / APK(s)"**
3. Chọn **"Build APK(s)"**
4. Đợi build hoàn tất (1-2 phút)

### Bước 5: Lấy file APK
1. Khi build xong, sẽ có thông báo ở góc dưới bên phải
2. Click **"locate"** hoặc **"Show in Explorer"**
3. Hoặc vào thư mục: `android-app/app/build/outputs/apk/debug/`
4. File APK tên là: **app-debug.apk**

### Bước 6: Cài đặt APK lên điện thoại
1. Copy file `app-debug.apk` vào điện thoại Android
2. Trên điện thoại: **Settings > Security > Cho phép cài đặt từ nguồn không xác định**
3. Mở file APK và cài đặt

---

## Phương pháp 2: Build Online (Không cần cài đặt gì)

### Sử dụng GitHub Actions (Miễn phí)

1. **Tạo repository GitHub:**
   - Đăng nhập GitHub
   - Tạo repository mới
   - Upload toàn bộ thư mục `android-app` lên GitHub

2. **Tạo GitHub Actions workflow:**
   - Vào repository > Actions > New workflow
   - Tạo file `.github/workflows/build.yml` với nội dung:

```yaml
name: Build APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK
      uses: actions/setup-java@v3
      with:
        java-version: '11'
    - name: Grant execute permission for gradlew
      run: chmod +x gradlew
    - name: Build APK
      run: ./gradlew assembleDebug
    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: app-debug
        path: app/build/outputs/apk/debug/app-debug.apk
```

3. **Build:**
   - Push code lên GitHub
   - Vào Actions tab
   - Chọn workflow và chạy
   - Tải APK từ Artifacts

---

## Phương pháp 3: Nhờ người khác build giúp

Bạn có thể:
1. Gửi thư mục `android-app` cho người có Android Studio
2. Họ sẽ build và gửi lại file APK cho bạn

---

## ⚠️ Lưu ý quan trọng

- **Phương pháp 1 (Android Studio)** là dễ nhất và khuyến nghị nhất
- Build lần đầu có thể mất 10-15 phút (tải dependencies)
- Cần kết nối Internet để tải dependencies
- APK debug có thể cài đặt trực tiếp, không cần ký số

---

## ❓ Gặp vấn đề?

### Lỗi "SDK not found"
- Android Studio sẽ tự động cài SDK khi mở project lần đầu
- Đợi quá trình cài đặt hoàn tất

### Lỗi "Gradle sync failed"
- Kiểm tra kết nối Internet
- File > Invalidate Caches / Restart

### Không tìm thấy APK
- Đảm bảo build thành công (không có lỗi màu đỏ)
- Kiểm tra thư mục: `app/build/outputs/apk/debug/`

