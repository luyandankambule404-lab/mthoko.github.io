@echo off
title KMM Lifestyle - local server
cd /d "%~dp0"

echo.
echo  Starting KMM Lifestyle (website + sign-in API) at http://localhost:3000
echo  Your browser will open in a moment.
echo.
echo  Sign in / bookings / admin only work on this address — not the GitHub link.
echo  To stop: close this window or press Ctrl+C
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js is not installed. Install from https://nodejs.org then run this again.
  pause
  exit /b 1
)

if not exist "server\node_modules" (
  echo  Installing server dependencies (first time only)...
  call npm run install:server
  if errorlevel 1 (
    echo  Install failed. Try: cd server ^&^& npm install
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000/"
call npm start
