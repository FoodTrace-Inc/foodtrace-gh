@echo off
echo Starting FoodTrace GH...

start "FoodTrace Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "FoodTrace Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo Both servers are starting. The browser will open automatically.
