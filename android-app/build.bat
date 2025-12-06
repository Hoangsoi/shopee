@echo off
echo ========================================
echo    DailyShopee - Build APK Script
echo ========================================
echo.

REM Kiểm tra xem có Android SDK không
if not defined ANDROID_HOME (
    echo [ERROR] ANDROID_HOME chua duoc cai dat!
    echo.
    echo Vui long:
    echo 1. Cai dat Android Studio
    echo 2. Hoac set bien moi truong ANDROID_HOME
    echo.
    echo Hoac su dung Android Studio de build (de hon)
    echo.
    pause
    exit /b 1
)

echo [INFO] Dang kiem tra Gradle...
if not exist "gradlew.bat" (
    echo [ERROR] Khong tim thay gradlew.bat
    echo Vui long mo project trong Android Studio de tao gradle wrapper
    pause
    exit /b 1
)

echo [INFO] Bat dau build APK...
echo.

call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    BUILD THANH CONG!
    echo ========================================
    echo.
    echo APK duoc tao tai:
    echo app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Ban co muon mo thu muc chua APK? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        explorer app\build\outputs\apk\debug
    )
) else (
    echo.
    echo ========================================
    echo    BUILD THAT BAI!
    echo ========================================
    echo.
    echo Vui long kiem tra loi o tren
    echo Hoac su dung Android Studio de build
)

pause

