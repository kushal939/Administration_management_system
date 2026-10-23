@echo off
color 0B
echo.
echo ========================================
echo   NOTIFICATION SYSTEM DIAGNOSTIC
echo ========================================
echo.

echo [CHECK 1] Checking if backend files exist...
if exist "backend\routes\notifications.js" (
    echo   ✓ notifications.js exists
) else (
    echo   ✗ notifications.js MISSING!
    goto :error
)

if exist "backend\utils\notificationHelper.js" (
    echo   ✓ notificationHelper.js exists
) else (
    echo   ✗ notificationHelper.js MISSING!
    goto :error
)

if exist "frontend\src\components\NotificationBar.jsx" (
    echo   ✓ NotificationBar.jsx exists
) else (
    echo   ✗ NotificationBar.jsx MISSING!
    goto :error
)
echo.

echo [CHECK 2] Checking database...
cd backend
sqlite3 database.sqlite ".tables" > temp_tables.txt 2>&1
findstr /C:"notifications" temp_tables.txt >nul
if %errorlevel% equ 0 (
    echo   ✓ notifications table exists
) else (
    echo   ✗ notifications table MISSING!
    echo   Run: node init-notifications.js
    del temp_tables.txt
    goto :error
)
del temp_tables.txt
echo.

echo [CHECK 3] Checking if backend is running...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ Backend is running on port 3001
) else (
    echo   ✗ Backend is NOT running!
    echo   Run: node server.js
    goto :error
)
echo.

echo [CHECK 4] Checking notifications API...
curl -s http://localhost:3001/api/notifications > temp_notif.txt 2>&1
findstr /C:"success" temp_notif.txt >nul
if %errorlevel% equ 0 (
    echo   ✓ Notifications API is working
) else (
    echo   ✗ Notifications API NOT working!
    echo   Backend needs restart!
    del temp_notif.txt
    goto :error
)
del temp_notif.txt
echo.

echo [CHECK 5] Checking notification count...
sqlite3 database.sqlite "SELECT COUNT(*) FROM notifications;" > temp_count.txt 2>&1
set /p count=<temp_count.txt
echo   ✓ Found %count% notifications in database
del temp_count.txt
if %count% equ 0 (
    echo   ! No test notifications found
    echo   Run: node test-notifications.js
)
echo.

echo ========================================
echo   ALL CHECKS PASSED! ✓
echo ========================================
echo.
echo Your notification system is ready!
echo.
echo Next steps:
echo 1. Make sure frontend is running: npm run dev
echo 2. Open http://localhost:5173
echo 3. Login and check the bell icon 🔔
echo.
goto :end

:error
echo.
echo ========================================
echo   ERRORS FOUND! ✗
echo ========================================
echo.
echo Please fix the errors above and try again.
echo.
echo Quick fix:
echo 1. cd backend
echo 2. node init-notifications.js
echo 3. node test-notifications.js
echo 4. node server.js
echo.

:end
cd ..
pause
