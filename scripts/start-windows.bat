@echo off
setlocal
cd /d "%~dp0\.."

set "NODE_EXE="
for %%I in (node.exe) do call :try_node "%%~$PATH:I"
call :try_node "%ProgramFiles%\nodejs\node.exe"
call :try_node "%LocalAppData%\Programs\nodejs\node.exe"
call :try_node "%UserProfile%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not defined NODE_EXE (
  echo Node.js 24 or newer was not found. Install Node.js 24 or newer, then run this file again.
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

:try_node
if defined NODE_EXE exit /b 0
if "%~1"=="" exit /b 0
if not exist "%~1" exit /b 0
"%~1" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)" >nul 2>nul
if not errorlevel 1 set "NODE_EXE=%~1"
exit /b 0
