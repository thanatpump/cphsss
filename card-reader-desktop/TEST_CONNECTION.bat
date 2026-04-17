@echo off
chcp 65001 >nul
echo ========================================
echo   ทดสอบการเชื่อมต่อกับ Server
echo ========================================
echo.

cd /d "%~dp0"

REM ตรวจสอบว่า Node.js ติดตั้งแล้วหรือยัง
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ไม่พบ Node.js!
    echo.
    echo 💡 กรุณาติดตั้ง Node.js ก่อน
    echo    ดาวน์โหลดจาก: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM ตรวจสอบว่ามี config.json หรือยัง
if not exist "config.json" (
    echo ⚠️  ไม่พบไฟล์ config.json!
    echo.
    echo 💡 กรุณารัน SETUP.bat ก่อนเพื่อตั้งค่า Server URL
    echo.
    pause
    exit /b 1
)

echo 🧪 กำลังทดสอบการเชื่อมต่อ...
echo.
node test-connection.js

echo.
pause
