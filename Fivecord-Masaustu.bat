@echo off
title Fivecord Masaustu Uygulamasi
cd /d "C:\Users\asus\.gemini\antigravity\scratch\fivecord"
echo ========================================================
echo   🖥️ FIVECORD - 5 Kisilik Masaustu Uygulamasi
echo ========================================================
echo.
echo Uygulama baslatiliyor, lutfen bekleyin...
call "node_modules\.bin\electron.cmd" desktop\main.cjs
pause