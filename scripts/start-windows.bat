@echo off
cd /d "%~dp0\.."
if not exist node_modules npm install
npm run build
node --no-warnings server\index.cjs
