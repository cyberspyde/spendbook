@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Start server (prod) and frontend preview in separate windows

echo Starting SpendBook - PROD mode...

REM Start backend server (node)
start "SpendBook Server (prod)" cmd /k "cd /d "%~dp0server" && npm run start"

REM Start frontend preview (vite preview) on LAN host, same port as build preview default
start "SpendBook Frontend (prod)" cmd /k "cd /d "%~dp0" && npm run preview -- --host 0.0.0.0"

endlocal
