@echo off
:: Card Reader Service Starter
:: For Windows

echo ========================================
echo     Card Reader Service
echo     SSO Chaiyaphum
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking Node.js...
node --version
echo.

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [2/3] Installing dependencies...
    call npm install
    echo.
) else (
    echo [2/3] Dependencies already installed
    echo.
)

:: Start Card Reader Service
echo [3/3] Starting Card Reader Service...
echo.
echo ========================================
echo   Service running at:
echo   http://localhost:8080
echo.
echo   Insert your ID card and open:
echo   http://your-server-ip:3000
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

node card-reader-service.js

pause



