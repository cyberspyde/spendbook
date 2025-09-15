@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Start server (dev) and frontend (dev) in separate windows

echo Starting SpendBook - DEV mode...

REM Start backend server (nodemon) in a new window
start "SpendBook Server (dev)" cmd /k "cd /d "%~dp0server" && npx nodemon --config nodemon.json server.js"

REM Start frontend (vite dev) in a new window
start "SpendBook Frontend (dev)" cmd /k "cd /d "%~dp0" && npm run dev"

endlocal
