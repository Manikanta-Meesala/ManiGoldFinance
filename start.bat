@echo off
echo ===================================================
echo        STARTING MANIGOLDFINANCE (SPRING BOOT)
echo ===================================================
echo.
echo Starting Spring Boot backend API server...
start /B cmd /c "set JAVA_HOME=C:\Java\jdk-21&& "C:\Java\jdk-21\bin\java.exe" -jar backend-spring\target\finance-1.0.0.jar"

echo Starting frontend Vite dev server...
start /B cmd /c "cd frontend && npm run dev"

echo Waiting for services to initialize...
timeout /t 5 /nobreak > NUL

echo Opening ManiGoldFinance in your web browser...
start http://localhost:5173

echo.
echo ===================================================
echo ManiGoldFinance (Spring Boot) is now running!
echo Keep this window open while using the application.
echo To stop the application, close this window.
echo ===================================================
echo.
pause
