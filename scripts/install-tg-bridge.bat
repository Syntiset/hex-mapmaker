@echo off
setlocal enabledelayedexpansion

REM ====================================================================
REM Install Windows service TGClaudeBridge via NSSM.
REM Right-click -> Run as administrator (auto-elevates via UAC otherwise)
REM ====================================================================

REM ===== Self-elevate =====
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Need administrator. Requesting UAC...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

REM ===== Config =====
set "NSSM=C:\nssm-2.24\win64\nssm.exe"
set "PROJECT=C:\Users\mlg20\source\repos\claude\mapmaker"
set "SCRIPT=%PROJECT%\scripts\tg-claude-bridge.mjs"
set "LOGDIR=%PROJECT%\logs"
set "SERVICE=TGClaudeBridge"

echo.
echo ==========================================================
echo Installing service: %SERVICE%
echo ==========================================================
echo.

REM ===== Find node.exe =====
echo [1/5] Locating node.exe in PATH...
set "NODE="
for /f "delims=" %%i in ('where node 2^>nul') do (
    if not defined NODE set "NODE=%%i"
)
if not defined NODE (
    echo   ERROR: node.exe not found in PATH.
    pause
    exit /b 1
)
echo   Found: %NODE%

REM ===== Sanity checks =====
echo [2/5] Checking files...
if not exist "%NSSM%" (
    echo   ERROR: NSSM not found at %NSSM%
    pause
    exit /b 1
)
if not exist "%SCRIPT%" (
    echo   ERROR: Bridge script not found at %SCRIPT%
    pause
    exit /b 1
)
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
echo   OK.

REM ===== Remove previous installation =====
echo [3/5] Removing previous service installation if any...
"%NSSM%" stop %SERVICE% >nul 2>&1
"%NSSM%" remove %SERVICE% confirm >nul 2>&1
echo   OK.

REM ===== Install =====
echo [4/5] Registering service...
"%NSSM%" install %SERVICE% "%NODE%" "%SCRIPT%"
if errorlevel 1 (
    echo   ERROR: nssm install failed.
    pause
    exit /b 1
)
"%NSSM%" set %SERVICE% AppDirectory     "%PROJECT%"
"%NSSM%" set %SERVICE% AppStdout        "%LOGDIR%\tg-bridge.log"
"%NSSM%" set %SERVICE% AppStderr        "%LOGDIR%\tg-bridge.err.log"
"%NSSM%" set %SERVICE% AppRotateFiles   1
"%NSSM%" set %SERVICE% AppRotateBytes   5242880
"%NSSM%" set %SERVICE% Start            SERVICE_AUTO_START
"%NSSM%" set %SERVICE% AppExit Default  Restart
"%NSSM%" set %SERVICE% AppRestartDelay  5000
"%NSSM%" set %SERVICE% Description      "Telegram-Claude bridge for mapmaker"
echo   OK.

REM ===== Start =====
echo [5/5] Starting service...
"%NSSM%" start %SERVICE%
timeout /t 2 /nobreak >nul

echo.
echo ==========================================================
echo Service status:
echo ==========================================================
sc query %SERVICE% | findstr /C:"STATE"
echo.
echo If STATE = RUNNING - all good. Send a message to the bot to test.
echo.
echo Logs:
echo   %LOGDIR%\tg-bridge.log
echo   %LOGDIR%\tg-bridge.err.log
echo.
echo Service control (admin cmd/powershell):
echo   "%NSSM%" stop    %SERVICE%
echo   "%NSSM%" start   %SERVICE%
echo   "%NSSM%" restart %SERVICE%
echo   "%NSSM%" remove  %SERVICE% confirm
echo.
pause
