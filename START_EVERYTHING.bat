@echo off
color 0A
echo.
echo ========================================
echo   ADMINISTRATION MANAGEMENT SYSTEM
echo   COMPLETE STARTUP SCRIPT
echo ========================================
echo.

REM Kill any existing Node processes
echo [1/5] Stopping any running servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo       Done!
echo.

REM Initialize notifications
echo [2/5] Initializing notifications system...
cd backend
node init-notifications.js
echo       Done!
echo.

REM Create test notifications
echo [3/5] Creating test notifications...
node test-notifications.js
echo       Done!
echo.

REM Start backend server
echo [4/5] Starting backend server...
start "Backend Server" cmd /k "echo Backend Server Running on http://localhost:3001 && node server.js"
timeout /t 3 /nobreak >nul
echo       Backend started on http://localhost:3001
echo.

REM Start frontend
echo [5/5] Starting frontend...
cd ..\frontend
start "Frontend Server" cmd /k "echo Frontend Running on http://localhost:5173 && npm run dev"
echo       Frontend starting on http://localhost:5173
echo.

echo ========================================
echo   ALL SERVERS STARTED!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Test Accounts:
echo   Admin:     admin@school.com / admin123
echo   Principal: principal@school.com / principal123
echo   Teacher:   teacher@school.com / teacher123
echo   Student:   student@school.com / student123
echo.
echo Notifications: Check the bell icon in top right!
echo.
echo Press any key to open browser...
pause >nul

REM Open browser
start http://localhost:5173

echo.
echo Browser opened! Login and check notifications.
echo.
echo Keep this window open. Close it to stop servers.
echo.
pause
