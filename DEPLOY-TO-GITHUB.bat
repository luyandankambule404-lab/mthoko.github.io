@echo off
title Deploy website to GitHub Pages
cd /d "%~dp0"

echo.
echo  === Deploy website to GitHub ===
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo  Install Git first: https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist "index.html" (
  echo  ERROR: index.html not found in this folder.
  pause
  exit /b 1
)

if not exist "images\profile.png" (
  echo  WARNING: images\profile.png is missing - photos will not show online.
  echo.
)

git branch -M main 2>nul

git add -A
git status
echo.

set /p DOPUSH="Create commit now? (Y/N): "
if /i not "%DOPUSH%"=="Y" (
  echo  Cancelled. Run again when ready.
  pause
  exit /b 0
)

git commit -m "Publish website for GitHub Pages"
if errorlevel 1 (
  echo  Nothing new to commit, or commit failed.
)

echo.
echo  Default repo: https://github.com/luyandankambule404-lab/mthoko.github.io.git
echo  Press Enter to use it, or type a different URL.
echo.
set /p REPOURL="Repo URL: "
if "%REPOURL%"=="" set REPOURL=https://github.com/luyandankambule404-lab/mthoko.github.io.git
if "%REPOURL%"=="" (
  echo  No URL entered. Add remote manually:
  echo    git remote add origin YOUR-URL
  echo    git push -u origin main
  pause
  exit /b 0
)

git remote remove origin 2>nul
git remote add origin "%REPOURL%"
git push -u origin main

echo.
echo  === Next: enable GitHub Pages ===
echo  1. Open your repo on github.com
echo  2. Settings -^> Pages
echo  3. Source: GitHub Actions
echo  4. Wait for Actions tab to show a green checkmark
echo  5. Your URL will appear on the Pages settings screen
echo.
pause
