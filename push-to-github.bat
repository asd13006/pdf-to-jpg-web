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
    set "MSG=v2.0.0 update %DATE% %TIME%"
) else (
    set "MSG=%~1"
)

REM --- step 1: pull latest ---
echo [1/4] Pulling latest from GitHub...
git pull origin main --rebase 2>nul

REM --- step 2: stage ---
echo [2/4] Staging files...
git add -A

REM --- step 3: commit ---
echo [3/4] Committing...
git commit -m "%MSG%" 2>nul
if errorlevel 1 (
    echo No changes to commit.
)

REM --- step 4: push ---
echo.
echo [4/4] Pushing to GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo [FAIL] Push failed. Check:
    echo   1. GitHub login: run "git push" manually once
    echo   2. Or use token: git remote set-url origin https://TOKEN@github.com/asd13006/pdf-to-jpg-web.git
) else (
    echo.
    echo ========================================
    echo   Push successful!
    echo ========================================
)

echo.
pause
