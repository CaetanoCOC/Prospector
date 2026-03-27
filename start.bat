@echo off
echo ============================================
echo  Prospector — Starting backend + frontend
echo ============================================

:: Activate conda env and start backend
start "Prospector Backend" cmd /k "conda activate D:\PORTFOLIO\Prospector\psp && cd D:\PORTFOLIO\Prospector && pip install -r requirements.txt -q && uvicorn backend.main:app --port 5011 --reload"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak > nul

:: Start frontend
start "Prospector Frontend" cmd /k "cd D:\PORTFOLIO\Prospector\frontend && npm run dev"

:: Open browser
timeout /t 4 /nobreak > nul
start http://localhost:5012

echo.
echo Backend:  http://localhost:5011
echo Frontend: http://localhost:5012
echo API Docs: http://localhost:5011/docs
echo.
pause
