# Hướng dẫn Build APK

## Cách 1: Sử dụng Android Studio (Khuyến nghị)

1. Mở Android Studio
2. File > Open > Chọn thư mục `android-app`
3. Đợi Gradle sync hoàn tất
4. Build > Build Bundle(s) / APK(s) > Build APK(s)
5. APK sẽ được tạo tại: `app/build/outputs/apk/debug/app-debug.apk`

## Cách 2: Sử dụng Command Line

### Yêu cầu:
- JDK 11 hoặc cao hơn
- Android SDK đã được cài đặt
- Biến môi trường ANDROID_HOME đã được set

### Trên Windows:
```bash
cd android-app
gradlew.bat assembleDebug
```

### Trên Linux/Mac:
```bash
cd android-app
chmod +x gradlew
./gradlew assembleDebug
```

## Cách 3: Build Online (Không cần cài đặt)

Sử dụng các dịch vụ build online như:
- GitHub Actions
- Bitrise
- AppCircle

## Sau khi build xong

APK sẽ có tại: `app/build/outputs/apk/debug/app-debug.apk`

Copy file này vào điện thoại Android và cài đặt.

