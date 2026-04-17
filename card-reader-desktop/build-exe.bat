@echo off
echo ========================================
echo   สร้างไฟล์ .exe สำหรับ SSO Card Reader
echo ========================================
echo.

cd /d "%~dp0"

echo 📦 กำลังติดตั้ง pkg...
call npm install -g pkg

echo.
echo 🔨 กำลังสร้างไฟล์ .exe...
call npm run build-exe

echo.
echo ✅ เสร็จสิ้น! ไฟล์ SSO-CardReader.exe อยู่ในโฟลเดอร์นี้
echo.
pause
