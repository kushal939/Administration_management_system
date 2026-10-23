@echo off
echo ========================================
echo   Assignments System Quick Fix
echo ========================================
echo.

echo Step 1: Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node processes stopped
) else (
    echo [INFO] No Node processes were running
)
echo.

echo Step 2: Verifying files...
if exist "routes\assignments.js" (
    echo [OK] assignments.js found
) else (
    echo [ERROR] assignments.js NOT found!
    echo Please ensure you're in the backend directory
    pause
    exit /b 1
)
echo.

echo Step 3: Starting server with diagnostics...
echo.
node start-server.js
