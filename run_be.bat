@echo off
echo Starting MusicApp Backend (Connected to REAL VPS Database ^& S3)...
echo.

REM Avvia il tunnel SSH in background sulla porta locale 5434 verso il Postgres reale del VPS (127.0.0.1:5434) se non gia' attivo
netstat -ano | findstr "127.0.0.1:5434 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Opening SSH Tunnel to VPS PostgreSQL ^(127.0.0.1:5434 -^> VPS:5434^)...
    start "MusicApp VPS DB Tunnel" /MIN ssh -i "%USERPROFILE%\.ssh\id_ed25519_davluisi" -o StrictHostKeyChecking=no -N -L 127.0.0.1:5434:127.0.0.1:5434 root@217.76.60.25
    timeout /t 2 /nobreak >nul
) else (
    echo SSH Tunnel on port 5434 is already active.
)

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
set "PATH=%JAVA_HOME%\bin;C:\Users\david\tools\apache-maven-3.9.6\bin;%PATH%"

echo Starting Spring Boot Backend...
cd backend
call mvn spring-boot:run
