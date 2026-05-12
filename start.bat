@echo off
title Ulearning Auto Browser v2.1
cd /d "%~dp0"

echo.
echo   ==========================================
echo     Ulearning Auto Browser v2.1
echo     Auto Play / Auto Answer / Auto Next
echo   ==========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found
    echo.
    echo   Please install Node.js first:
    echo   https://nodejs.org/
    echo.
    echo   Download the LTS version, install with default settings.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo   [OK] Node.js %NODE_VER%

REM Find Chrome in C:\chrome-win64
set "CHROME_PATH=C:\chrome-win64\chrome.exe"

if not exist "%CHROME_PATH%" (
    echo.
    echo   [ERROR] Chrome not found at %CHROME_PATH%
    echo.
    echo   Please make sure Chrome is in C:\chrome-win64\
    echo.
    pause
    exit /b 1
)

echo   [OK] Chrome found: %CHROME_PATH%

REM Tell JS to use system Chrome
set CHROME_FOR_TESTING=%CHROME_PATH%

REM Skip Playwright's own browser download
set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

REM Launch
echo.
echo   [START] Launching browser ...
echo.
node ulearning-auto.js %*

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Runtime error, please screenshot and report
    pause
)
