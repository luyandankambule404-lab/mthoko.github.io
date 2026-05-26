@echo off
title Upload images to GitHub
cd /d "%~dp0"

echo.
echo  This adds your photos folder so GitHub Pages can show them.
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo  Git is not installed. Install from https://git-scm.com/download/win
  echo  Or upload the "images" folder manually on github.com in your repo.
  pause
  exit /b 1
)

if not exist "images\profile.png" (
  echo  ERROR: images\profile.png is missing. Add your photo to the images folder first.
  pause
  exit /b 1
)

if not exist ".git" (
  echo  Initializing git repository...
  git init
)

git add images/profile.png images/README.md .gitignore
git add -A
echo.
git status
echo.
echo  Next steps:
echo    1. git commit -m "Add site images for GitHub Pages"
echo    2. git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
echo       (skip if already added)
echo    3. git push -u origin main
echo.
echo  Or use GitHub Desktop: commit and push all files including the images folder.
echo.
pause
