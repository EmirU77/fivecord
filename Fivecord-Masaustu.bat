@echo off
title Synapse Masaustu Uygulamasi
cd /d "C:\Users\asus\.gemini\antigravity\scratch\fivecord"
echo ========================================================
echo   🖥️ SYNAPSE - Masaustu Uygulamasi
echo ========================================================
echo.
echo Uygulama baslatiliyor, lutfen bekleyin...
call "node_modules\.bin\electron.cmd" desktop\main.cjs
pause