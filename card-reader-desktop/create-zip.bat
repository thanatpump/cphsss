@echo off
chcp 65001 >nul
echo ========================================
echo   สร้างไฟล์ ZIP สำหรับแจกจ่าย
echo   SSO Card Reader
echo ========================================
echo.

cd /d "%~dp0"

set ZIP_NAME=SSO-CardReader-For-Users.zip
set FOLDER_NAME=SSO-CardReader-For-Users

REM ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่
if not exist "%FOLDER_NAME%" (
    echo ❌ ไม่พบโฟลเดอร์ %FOLDER_NAME%!
    echo.
    echo 💡 กรุณาสร้างโฟลเดอร์และ copy ไฟล์เข้าไปก่อน
    echo.
    pause
    exit /b 1
)

echo ✅ พบโฟลเดอร์ %FOLDER_NAME%
echo.

REM ลบไฟล์ ZIP เก่า (ถ้ามี)
if exist "%ZIP_NAME%" (
    echo 🗑️  ลบไฟล์ ZIP เก่า...
    del "%ZIP_NAME%" >nul 2>&1
)

echo 📦 กำลังสร้างไฟล์ ZIP...
echo.

REM ตรวจสอบว่ามี PowerShell หรือไม่
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo 💡 ใช้ PowerShell เพื่อสร้าง ZIP...
    powershell -Command "Compress-Archive -Path '%FOLDER_NAME%\*' -DestinationPath '%ZIP_NAME%' -Force"
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo   ✅ สร้างไฟล์ ZIP สำเร็จ!
        echo ========================================
        echo.
        echo 📁 ไฟล์: %ZIP_NAME%
        echo.
        
        REM แสดงขนาดไฟล์
        for %%A in ("%ZIP_NAME%") do (
            set size=%%~zA
            set /a sizeMB=%%~zA/1024/1024
            echo 📊 ขนาด: !sizeMB! MB
        )
        
        echo.
        echo 💡 ไฟล์พร้อมแจกจ่ายแล้ว!
        echo.
    ) else (
        echo.
        echo ❌ สร้างไฟล์ ZIP ล้มเหลว
        echo.
        echo 💡 ลองใช้วิธีอื่น:
        echo    1. คลิกขวาที่โฟลเดอร์ %FOLDER_NAME%
        echo    2. เลือก "Send to" → "Compressed (zipped) folder"
        echo.
    )
) else (
    echo ⚠️  ไม่พบ PowerShell
    echo.
    echo 💡 กรุณาใช้วิธีนี้แทน:
    echo    1. คลิกขวาที่โฟลเดอร์ %FOLDER_NAME%
    echo    2. เลือก "Send to" → "Compressed (zipped) folder"
    echo    3. ไฟล์ ZIP จะถูกสร้างอัตโนมัติ
    echo.
)

pause
