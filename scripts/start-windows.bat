@echo off
setlocal
cd /d "%~dp0\.."

set "NODE_EXE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%UserProfile%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%UserProfile%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined NODE_EXE for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"

if not defined NODE_EXE (
  echo Node.js was not found on PATH. Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)

"%NODE_EXE%" -v >nul 2>nul
if errorlevel 1 (
  echo Node.js was found but could not be started:
  echo %NODE_EXE%
  echo Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "NPM_CMD="
set "NPM_CLI="
if exist "%NODE_DIR%npm.cmd" set "NPM_CMD=%NODE_DIR%npm.cmd"
if exist "%NODE_DIR%node_modules\npm\bin\npm-cli.js" set "NPM_CLI=%NODE_DIR%node_modules\npm\bin\npm-cli.js"

if not exist node_modules (
  if not defined NPM_CMD if not defined NPM_CLI (
    echo npm was not found next to the selected Node.js install, and node_modules is missing.
    echo Reinstall Node.js with npm enabled, then run this file again.
    pause
    exit /b 1
  )
  if defined NPM_CMD (
    call "%NPM_CMD%" install
  ) else (
    "%NODE_EXE%" "%NPM_CLI%" install
  )
  if errorlevel 1 goto failed
)

if exist node_modules\vite\bin\vite.js (
  "%NODE_EXE%" node_modules\vite\bin\vite.js build
) else (
  if defined NPM_CMD (
    call "%NPM_CMD%" run build
  ) else if defined NPM_CLI (
    "%NODE_EXE%" "%NPM_CLI%" run build
  ) else (
    echo npm was not found next to the selected Node.js install, and Vite is not installed locally.
    echo Reinstall dependencies with Node.js/npm, then run this file again.
    pause
    exit /b 1
  )
)
if errorlevel 1 goto failed

echo.
echo MangaTranslator is starting at http://127.0.0.1:3127
echo Keep this window open while you use the app.
echo.
"%NODE_EXE%" --no-warnings server\index.cjs
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo MangaTranslator failed to start. See the error output above.
pause
exit /b 1
