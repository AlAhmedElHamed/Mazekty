@echo off
chcp 65001 > nul
title مزيكتي برو - Mazekty Pro for Windows

echo =======================================================
echo    مزيكتي برو - Mazekty Pro for Windows
echo =======================================================
echo.

cd /d "%~dp0"

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python 3 is not detected in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: Create virtual environment if not exists
if not exist "venv\Scripts\activate.bat" (
    echo [*] Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install / verify dependencies
echo [*] Verifying dependencies...
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q

:: Ensure downloads directory
if not exist "downloads" mkdir downloads

:: Launch the application
echo.
echo [✓] Starting Mazekty Pro...
if exist "venv\Scripts\pythonw.exe" (
    start "" "venv\Scripts\pythonw.exe" desktop.py
) else (
    python desktop.py
)

exit /b 0
