@echo off
title PDF2IMG Pro - Push to GitHub

echo ========================================
echo   PDF2IMG Pro - Push to GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM ─── Commit message ───
if "%~1"=="" (
    set "MSG=Update %DATE% %TIME:~0,5%"
) else (
    set "MSG=%~1"
)

REM ─── First-time: init git ───
if not exist ".git" (
    echo [1/4] Initializing Git...
    git init
    git branch -M main
) else (
    echo [1/4] Git already initialized.
)

REM ─── Set remote ───
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [2/4] Setting remote origin...
    git remote add origin https://github.com/asd13006/pdf-to-jpg-web.git
) else (
    echo [2/4] Remote origin already set.
)

REM ─── Stage ───
echo [3/4] Staging files...
git add -A

REM ─── Commit & Push ───
echo [4/4] Committing: "%MSG%"
git commit -m "%MSG%"

if errorlevel 1 (
    echo.
    echo Nothing to commit, or commit failed.
) else (
    echo.
    echo Pushing to GitHub...
    git push -u origin main
)

echo.
echo ========================================
echo   Done!
echo ========================================
pause
