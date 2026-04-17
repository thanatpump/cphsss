@echo off
chcp 65001 >nul
echo ========================================
echo 🎴 Card Reader Service
echo ========================================
echo.
echo กำลังเริ่ม Card Reader Service...
echo.

cd /d "%~dp0"

REM ตรวจสอบว่า Node.js ติดตั้งอยู่หรือไม่
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ไม่พบ Node.js
    echo 💡 กรุณาติดตั้ง Node.js จาก https://nodejs.org/
    pause
    exit /b 1
)

REM ตรวจสอบว่า read-card-service.js มีอยู่หรือไม่
if not exist "read-card-service.js" (
    echo ❌ ไม่พบไฟล์ read-card-service.js
    pause
    exit /b 1
)

REM รัน service
echo ✅ กำลังเริ่ม Card Reader Service ที่ http://localhost:3002
echo.
echo 💡 วิธีใช้งาน:
echo    1. เสียบเครื่องอ่านบัตรเข้า USB
echo    2. เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
echo    3. เปิดหน้าเว็บ allocation-check/data
echo    4. กดปุ่ม "อ่านบัตรและเช็คสิทธิ์"
echo.
echo ⚠️  อย่าปิดหน้าต่างนี้ - Service ต้องรันอยู่ตลอดเวลา
echo.

node read-card-service.js

pause
