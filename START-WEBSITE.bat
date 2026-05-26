@echo off
title Website - local server
cd /d "%~dp0"

echo.
echo  Starting your website at http://127.0.0.1:8080/
echo  Your browser should open in a moment.
echo.
echo  To stop the server: close this window or press Ctrl+C
echo.

where python >nul 2>&1
if errorlevel 1 goto :no_python

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8080/"
python -m http.server 8080
exit /b 0

:no_python
echo  Python not found — trying Edge or Chrome instead...
call "%~dp0OPEN-IN-BROWSER.bat"
echo.
pause
exit /b 1
