@echo off
chcp 65001 >nul
echo ========================================
echo   สร้างไฟล์ .exe แบบ Standalone
echo   (ไม่ต้องติดตั้ง npm, Node.js)
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

REM ติดตั้ง pkg ถ้ายังไม่มี
echo 📦 กำลังตรวจสอบ pkg...
call npm list -g pkg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📥 กำลังติดตั้ง pkg...
    call npm install -g pkg
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ ไม่สามารถติดตั้ง pkg ได้
        pause
        exit /b 1
    )
)

REM ติดตั้ง dependencies
if not exist "node_modules" (
    echo 📦 กำลังติดตั้ง dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ ไม่สามารถติดตั้ง dependencies ได้
        pause
        exit /b 1
    )
)

echo.
echo 🔨 กำลังสร้างไฟล์ .exe...
echo    (อาจใช้เวลาสักครู่...)
echo.

call npm run build-exe

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   ✅ สร้างไฟล์สำเร็จ!
    echo ========================================
    echo.
    echo 📁 ไฟล์: SSO-CardReader.exe
    echo.
    echo 💡 วิธีใช้งาน:
    echo    1. คัดลอกไฟล์ SSO-CardReader.exe ไปยังเครื่องที่ต้องการ
    echo    2. คัดลอกโฟลเดอร์ ThaiIDCardReader ไปด้วย
    echo    3. ดับเบิ้ลคลิก SSO-CardReader.exe เพื่อรัน
    echo    4. ไม่ต้องติดตั้ง Node.js หรือ npm
    echo.
) else (
    echo.
    echo ❌ สร้างไฟล์ล้มเหลว
    echo.
)

pause
