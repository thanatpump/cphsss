@echo off
chcp 65001 >nul
echo ========================================
echo   สร้างไฟล์ .exe ด้วย Electron Builder
echo   สำหรับ SSO Card Reader
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

echo ✅ พบ Node.js
node --version
echo.

REM ติดตั้ง dependencies
if not exist "node_modules" (
    echo 📦 กำลังติดตั้ง dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ ไม่สามารถติดตั้ง dependencies ได้
        pause
        exit /b 1
    )
) else (
    echo ✅ พบ node_modules แล้ว
)

echo.
echo 🔨 กำลังสร้างไฟล์ .exe ด้วย Electron Builder...
echo    (อาจใช้เวลาสักครู่...)
echo.

call npm run build-win

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   ✅ สร้างไฟล์สำเร็จ!
    echo ========================================
    echo.
    echo 📁 ไฟล์อยู่ในโฟลเดอร์: dist-electron\
    echo.
    echo 💡 ไฟล์ที่สร้าง:
    echo    - SSO Card Reader Setup.exe (Installer)
    echo    - SSO-CardReader-Portable.exe (Portable - ไม่ต้องติดตั้ง)
    echo.
    echo 💡 สำหรับผู้ใช้:
    echo    - ใช้ Portable version: ดับเบิ้ลคลิกแล้วใช้งานได้เลย
    echo    - ใช้ Installer: ติดตั้งแล้วจะมี shortcut บน Desktop
    echo.
) else (
    echo.
    echo ❌ สร้างไฟล์ล้มเหลว
    echo.
)

pause
