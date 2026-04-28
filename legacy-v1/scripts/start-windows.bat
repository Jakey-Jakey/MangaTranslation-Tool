@echo off
cd /d "%~dp0\.."
if not exist node_modules npm install
node --no-warnings server\index.js
