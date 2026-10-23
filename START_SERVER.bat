@echo off
cd /d "%~dp0backend"
echo ========================================
echo Starting Backend Server...
echo ========================================
echo Server will run on: http://localhost:5000
echo Press Ctrl+C to stop the server
echo ========================================
node server.js
pause
