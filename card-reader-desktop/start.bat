@echo off
chcp 65001 >nul
echo ========================================
echo   SSO Card Reader Desktop Application
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

REM ตรวจสอบว่า config.json มี your-server หรือไม่
findstr /C:"your-server" config.json >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  ยังไม่ได้ตั้งค่า Server URL!
    echo.
    echo 💡 กรุณารัน SETUP.bat เพื่อตั้งค่า Server URL
    echo    หรือแก้ไขไฟล์ config.json ด้วย Notepad
    echo.
    pause
    exit /b 1
)

REM ตรวจสอบว่ามี node_modules หรือยัง
if not exist "node_modules" (
    echo ⚠️  ยังไม่ได้ติดตั้ง dependencies
    echo.
    echo 💡 กรุณารัน INSTALL_SIMPLE.bat ก่อน
    echo    หรือรันคำสั่ง: npm install
    echo.
    pause
    exit /b 1
)

echo 🚀 กำลังรันโปรแกรม...
echo.
node main.js

pause

