@echo off
chcp 65001 >nul
echo ========================================
echo   ตั้งค่า SSO Card Reader Desktop App
echo ========================================
echo.

cd /d "%~dp0"

REM ตรวจสอบว่ามี config.json อยู่แล้วหรือไม่
if exist "config.json" (
    echo ⚠️  พบไฟล์ config.json อยู่แล้ว
    echo.
    choice /C YN /M "ต้องการตั้งค่าใหม่หรือไม่ (Y/N)"
    if errorlevel 2 goto :end
    if errorlevel 1 goto :setup
) else (
    goto :setup
)

:setup
echo.
echo 📋 กรุณากรอกข้อมูลต่อไปนี้:
echo.

REM ถาม URL ของ Server
set /p SERVER_URL="🌐 URL ของ Server (เช่น https://sso.example.com): "
if "%SERVER_URL%"=="" (
    echo ❌ ไม่สามารถเว้นว่างได้
    pause
    exit /b 1
)

REM ถาม Port (ถ้าต้องการเปลี่ยน)
set /p PORT="🔌 Port (Enter = 3001): "
if "%PORT%"=="" set PORT=3001

REM ถาม URL ของ ThaiIDCardReader (ถ้าต้องการเปลี่ยน)
set /p THAIID_URL="🎴 URL ของ ThaiIDCardReader (Enter = https://localhost:8443/smartcard/data/): "
if "%THAIID_URL%"=="" set THAIID_URL=https://localhost:8443/smartcard/data/

echo.
echo 📝 กำลังสร้างไฟล์ config.json...
echo.

REM สร้างไฟล์ config.json
(
echo {
echo   "sso_api_url": "%SERVER_URL%",
echo   "port": %PORT%,
echo   "thaiid_reader_url": "%THAIID_URL%"
echo }
) > config.json

echo ✅ ตั้งค่าเสร็จสมบูรณ์!
echo.
echo 📋 สรุปการตั้งค่า:
echo    Server URL: %SERVER_URL%
echo    Port: %PORT%
echo    ThaiIDCardReader URL: %THAIID_URL%
echo.
echo 💡 ไฟล์ config.json ถูกสร้างแล้ว
echo    คุณสามารถแก้ไขได้ด้วย Notepad ถ้าต้องการ
echo.

:end
pause
