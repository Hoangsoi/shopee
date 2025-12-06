# DailyShopee Android App

Ứng dụng Android WebView để mở website https://dailyshopee.vercel.app

## Yêu cầu

- Android Studio (hoặc JDK 11+ và Android SDK)
- Android SDK 21+ (Android 5.0+)

## Build APK

### Trên Windows:
```bash
gradlew.bat assembleDebug
```

### Trên Linux/Mac:
```bash
./gradlew assembleDebug
```

APK sẽ được tạo tại: `app/build/outputs/apk/debug/app-debug.apk`

## Cài đặt

1. Bật "Cho phép cài đặt từ nguồn không xác định" trên điện thoại Android
2. Copy file APK vào điện thoại
3. Mở file APK và cài đặt

## Tính năng

- WebView full màn hình
- JavaScript enabled
- Tất cả link được load trong WebView (không mở trình duyệt ngoài)
- Hỗ trợ nút Back để quay lại trang trước
- Smooth scrolling

