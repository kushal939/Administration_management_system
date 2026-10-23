@echo off
echo.
echo ========================================
echo   RESTARTING BACKEND SERVER
echo ========================================
echo.
echo Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting backend server...
echo.
start cmd /k "node server.js"
echo.
echo ========================================
echo   Backend server started!
echo   Running on http://localhost:3001
echo ========================================
echo.
pause
