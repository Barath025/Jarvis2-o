@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo JARVIS System Setup for Windows
echo ===================================================
echo.

echo Installing dependencies (this may take a minute)...
call npm install

echo.
echo ===================================================
echo Setup complete!
echo ===================================================
echo To start the system, run:
echo npm run dev
echo.
pause
