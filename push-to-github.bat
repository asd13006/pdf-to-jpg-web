@echo off
chcp 65001 >nul 2>&1
title PDF2IMG Pro - Push to GitHub
cls

echo ========================================
echo   PDF2IMG Pro - Push to GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM --- check git installed ---
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found. Install Git from https://git-scm.com
    pause
    exit /b 1
)

REM --- commit message ---
if "%~1"=="" (
    set "MSG=v2.0.0 update: %DATE% %TIME%"
) else (
    set "MSG=%~1"
)

REM --- step 1: stage ---
echo [1/3] Staging files...
git add -A

REM --- step 2: commit ---
echo [2/3] Committing...
git commit -m "%MSG%"

REM --- step 3: push ---
echo.
echo [3/3] Pushing to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo [FAIL] Push failed. Check your GitHub login.
    echo Try: git remote set-url origin https://TOKEN@github.com/asd13006/pdf-to-jpg-web.git
) else (
    echo.
    echo ========================================
    echo   Push successful!
    echo ========================================
)

echo.
pause
