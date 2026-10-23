@echo off
title EK-MIKHA + SIKHYA SUCHAK - Starting All Services
color 0B
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║        Starting EK-MIKHA + SIKHYA SUCHAK            ║
echo ╚══════════════════════════════════════════════════════╝
echo.

set BASE=%~dp0

echo [1/3] Starting AMS Backend on port 3001...
start "AMS Backend (Port 3001)" cmd /k "cd /d %BASE%backend && node server.js"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Sikhya Suchak ML API on port 8001...
start "Sikhya Suchak ML API (Port 8001)" cmd /k "cd /d %BASE%sikhya_suchak && python -m uvicorn main:app --reload --port 8001"
timeout /t 4 /nobreak >nul

echo [3/3] Starting React Frontend on port 5173...
start "React Frontend (Port 5173)" cmd /k "cd /d %BASE%frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ✓ All services started!
echo.
echo   App:     http://localhost:5173
echo   AMS API: http://localhost:3001
echo   ML API:  http://localhost:8001
echo   ML Docs: http://localhost:8001/docs
echo.
echo Opening app in browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo Press any key to exit this window (services keep running)
pause >nul
