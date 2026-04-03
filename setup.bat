@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo JARVIS System Setup for Windows
echo ===================================================
echo.

echo Installing dependencies (this may take a minute)...
call npm install

echo.
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo.
    echo [IMPORTANT] Please open the .env file and add your GEMINI_API_KEY.
) else (
    echo .env file already exists.
)

echo.
echo ===================================================
echo Setup complete!
echo ===================================================
echo To start the system, run:
echo npm run dev
echo.
pause
