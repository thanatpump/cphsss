@echo off
chcp 65001 >nul
echo ========================================
echo   ติดตั้ง SSO Card Reader Desktop App
echo ========================================
echo.

cd /d "%~dp0"

REM ตรวจสอบว่า Node.js ติดตั้งแล้วหรือยัง
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ไม่พบ Node.js!
    echo.
    echo 📥 กำลังเปิดหน้าเว็บดาวน์โหลด Node.js...
    echo    กรุณาดาวน์โหลดและติดตั้ง Node.js LTS version
    echo    จาก: https://nodejs.org/
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ พบ Node.js
node --version
echo.

REM ตรวจสอบว่ามี node_modules หรือยัง
if not exist "node_modules" (
    echo 📦 กำลังติดตั้ง dependencies...
    echo    (อาจใช้เวลาสักครู่ ไม่ต้องกังวล)
    echo.
    call npm install --no-optional
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ การติดตั้งล้มเหลว
        echo 💡 ลองรันคำสั่งนี้ใน Command Prompt:
        echo    npm install --no-optional
        pause
        exit /b 1
    )
    echo.
    echo ✅ ติดตั้ง dependencies สำเร็จ!
) else (
    echo ✅ พบ node_modules แล้ว
)

echo.
echo ========================================
echo   ติดตั้งเสร็จสมบูรณ์!
echo ========================================
echo.
echo 📋 ขั้นตอนต่อไป:
echo    1. ดับเบิ้ลคลิก SETUP.bat เพื่อตั้งค่า Server URL
echo    2. หลังจากตั้งค่าแล้ว ดับเบิ้ลคลิก start.bat เพื่อรันโปรแกรม
echo.
echo 💡 หมายเหตุ:
echo    - คุณต้องรู้ URL ของ Server (เช่น https://sso.example.com)
echo    - ถ้า Server อยู่บน cloud ให้ใช้ URL ที่ได้จาก aaPanel
echo.
pause
