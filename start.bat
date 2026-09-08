@echo off
title Fivecord Private Launcher
echo ========================================================
echo   🚀 FIVECORD - 5 Kisilik Ozel Discord Platformu
echo ========================================================
echo.
echo 1. Backend sunucusu baslatiliyor (Port 3001)...
start "Fivecord Backend" cmd /k "cd backend && node src/server.js"

timeout /t 2 /nobreak >nul

echo 2. Frontend arayuzu baslatiliyor (Port 3000)...
start "Fivecord Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak >nul
echo.
echo Tarayiciniz aciliyor: http://localhost:3000
start http://localhost:3000
echo ========================================================
echo Her iki sunucu da aktif! Keyifli sohbetler dileriz.
echo ========================================================
