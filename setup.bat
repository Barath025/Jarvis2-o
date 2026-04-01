@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo JARVIS System Setup for Windows
echo ===================================================
echo.

if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env > nul
    echo.
    echo Please provide the following configuration values:
    echo.
    
    set /p gemini_key="Enter Gemini API Key: "
    set /p app_url="Enter App URL: "
    set /p supabase_url="Enter Supabase URL: "
    set /p supabase_key="Enter Supabase Anon Key: "
    
    echo.
    echo Updating .env file...
    
    powershell -Command "(gc .env) -replace 'GEMINI_API_KEY=\"MY_GEMINI_API_KEY\"', 'GEMINI_API_KEY=\"!gemini_key!\"' | Out-File -encoding ASCII .env"
    powershell -Command "(gc .env) -replace 'APP_URL=\"MY_APP_URL\"', 'APP_URL=\"!app_url!\"' | Out-File -encoding ASCII .env"
    powershell -Command "(gc .env) -replace 'VITE_SUPABASE_URL=\"https://mvnwqroxrmaxxtzlmqhl.supabase.co\"', 'VITE_SUPABASE_URL=\"!supabase_url!\"' | Out-File -encoding ASCII .env"
    powershell -Command "(gc .env) -replace 'VITE_SUPABASE_ANON_KEY=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bndxcm94cm1heHh0emxtcWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDcwMjMsImV4cCI6MjA5MDQyMzAyM30.0tB4P0KgBXicRb2Jw9SQuAxjacNFNtPi6vsn5tuB4pQ\"', 'VITE_SUPABASE_ANON_KEY=\"!supabase_key!\"' | Out-File -encoding ASCII .env"
    
    echo .env file updated successfully.
) else (
    echo .env file already exists. Skipping creation.
)

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
