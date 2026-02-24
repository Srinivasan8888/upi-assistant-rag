@echo off
echo Cleaning up old processes...
FOR /F "tokens=5" %%T IN ('netstat -aon ^| find ":5000" ^| find "LISTENING"') DO taskkill /F /PID %%T >nul 2>&1
FOR /F "tokens=5" %%T IN ('netstat -aon ^| find ":3000" ^| find "LISTENING"') DO taskkill /F /PID %%T >nul 2>&1
FOR /F "tokens=5" %%T IN ('netstat -aon ^| find ":8000" ^| find "LISTENING"') DO taskkill /F /PID %%T >nul 2>&1

echo Starting UPI Assistant...
echo.

REM Start backend (which auto-starts the Python RAG server)
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

REM Wait a few seconds for the RAG server to load the model
timeout /t 5 /nobreak >nul

REM Start frontend
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   RAG API:  http://localhost:8000
echo ========================================
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000
