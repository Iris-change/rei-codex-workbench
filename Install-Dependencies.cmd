@echo off
cd /d "%~dp0"
call npm --prefix workbench ci
if errorlevel 1 (
  echo Dependency installation failed. Install Node.js 20+ with npm first.
  pause
  exit /b 1
)
echo Dependencies installed. Run Start-Rei.cmd.
pause
