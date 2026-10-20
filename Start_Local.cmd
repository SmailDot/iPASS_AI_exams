@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install the official Windows LTS from nodejs.org once.
  echo Nothing has been downloaded or installed automatically.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo This Node.js version is too old. Node.js 22 or newer is required.
  pause
  exit /b 1
)
node "scripts\serve.mjs" --open
if errorlevel 1 (
  echo.
  echo Could not start. Read the error above. No firewall or browser security setting was changed.
  if not "%IPAS_NO_PAUSE%"=="1" pause
  exit /b 1
)
endlocal
