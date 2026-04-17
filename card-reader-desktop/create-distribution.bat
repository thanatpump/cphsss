@echo off
chcp 65001 >nul
echo ========================================
echo   สร้างไฟล์สำหรับแจกจ่าย
echo   SSO Card Reader
echo ========================================
echo.

cd /d "%~dp0"

REM ตรวจสอบว่า build แล้วหรือยัง
if not exist "dist-electron\SSO-CardReader-Portable.exe" (
    echo ❌ ไม่พบไฟล์ .exe!
    echo.
    echo 💡 กรุณา build ไฟล์ .exe ก่อน:
    echo    npm run build-win
    echo    หรือ
    echo    build-electron.bat
    echo.
    pause
    exit /b 1
)

echo ✅ พบไฟล์ .exe แล้ว
echo.

REM สร้างโฟลเดอร์สำหรับแจกจ่าย
set DIST_FOLDER=SSO-CardReader-For-Users

if exist "%DIST_FOLDER%" (
    echo 🗑️  ลบโฟลเดอร์เก่า...
    rmdir /s /q "%DIST_FOLDER%"
)

echo 📁 สร้างโฟลเดอร์ใหม่...
mkdir "%DIST_FOLDER%"

echo.
echo 📦 กำลัง copy ไฟล์...

REM Copy ไฟล์ .exe
copy "dist-electron\SSO-CardReader-Portable.exe" "%DIST_FOLDER%\" >nul
if %ERRORLEVEL% EQU 0 (
    echo    ✅ SSO-CardReader-Portable.exe
) else (
    echo    ❌ ไม่สามารถ copy SSO-CardReader-Portable.exe ได้
    pause
    exit /b 1
)

REM Copy config.json
if exist "config.json" (
    copy "config.json" "%DIST_FOLDER%\" >nul
    echo    ✅ config.json
) else (
    echo    ⚠️  ไม่พบ config.json
)

REM Copy โฟลเดอร์ ThaiIDCardReader
if exist "ThaiIDCardReader" (
    xcopy "ThaiIDCardReader" "%DIST_FOLDER%\ThaiIDCardReader\" /E /I /Y >nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✅ ThaiIDCardReader/
    ) else (
        echo    ❌ ไม่สามารถ copy ThaiIDCardReader/ ได้
    )
) else (
    echo    ⚠️  ไม่พบโฟลเดอร์ ThaiIDCardReader
)

REM Copy ไฟล์คำแนะนำ
if exist "สำหรับผู้ใช้สูงอายุ.txt" (
    copy "สำหรับผู้ใช้สูงอายุ.txt" "%DIST_FOLDER%\คู่มือใช้งาน.txt" >nul
    echo    ✅ คู่มือใช้งาน.txt
) else (
    echo    ⚠️  ไม่พบไฟล์คำแนะนำ
)

echo.
echo ========================================
echo   ✅ สร้างโฟลเดอร์สำเร็จ!
echo ========================================
echo.
echo 📁 โฟลเดอร์: %DIST_FOLDER%\
echo.
echo 💡 ขั้นตอนต่อไป:
echo    1. ตรวจสอบไฟล์ในโฟลเดอร์ %DIST_FOLDER%\
echo    2. ตรวจสอบ config.json ว่า URL ถูกต้องหรือไม่
echo    3. Zip โฟลเดอร์ %DIST_FOLDER%\
echo    4. แจกจ่ายไฟล์ .zip ให้ผู้ใช้
echo.
echo 💡 วิธี Zip:
echo    - คลิกขวาที่โฟลเดอร์ %DIST_FOLDER%\
echo    - เลือก "Send to" → "Compressed (zipped) folder"
echo.
pause
