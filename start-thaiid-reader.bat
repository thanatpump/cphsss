@echo off
chcp 65001 >nul
echo ========================================
echo 🎴 ThaiIDCardReader
echo ========================================
echo.
echo กำลังเริ่ม ThaiIDCardReader...
echo.

cd /d "%~dp0"

REM ตรวจสอบว่าไฟล์มีอยู่หรือไม่
if not exist "card-reader-desktop\SSO-CardReader-For-Users\ThaiIDCardReader\ThaiIDCardReader.exe" (
    echo ❌ ไม่พบไฟล์ ThaiIDCardReader.exe
    echo 💡 กรุณาตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์ card-reader-desktop
    pause
    exit /b 1
)

REM รัน ThaiIDCardReader.exe
echo ✅ กำลังเริ่ม ThaiIDCardReader.exe
echo.
echo 💡 วิธีใช้งาน:
echo    1. ThaiIDCardReader จะรันที่ https://localhost:8443
echo    2. เสียบเครื่องอ่านบัตรเข้า USB
echo    3. เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
echo    4. เปิดหน้าเว็บ allocation-check/data
echo    5. กดปุ่ม "อ่านบัตรและเช็คสิทธิ์"
echo.
echo ⚠️  อย่าปิดหน้าต่างนี้ - ThaiIDCardReader ต้องรันอยู่ตลอดเวลา
echo.

cd "card-reader-desktop\SSO-CardReader-For-Users\ThaiIDCardReader"
start "" "ThaiIDCardReader.exe"

echo ✅ เริ่ม ThaiIDCardReader.exe แล้ว
echo.
pause
