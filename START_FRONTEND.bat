@echo off
cd /d "%~dp0frontend"
echo ========================================
echo Starting Frontend Server...
echo ========================================
echo Server will run on: http://localhost:3000
echo Press Ctrl+C to stop the server
echo ========================================
call npm.cmd run dev
pause
