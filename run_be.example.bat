@echo off
echo Starting MusicApp Backend (Example)...
echo.

REM Opzionale: Decommenta se usi un tunnel SSH verso un database remoto
REM netstat -ano | findstr "127.0.0.1:5434 " | findstr "LISTENING" >nul 2>&1
REM if %ERRORLEVEL% NEQ 0 (
REM     echo Opening SSH Tunnel to remote DB...
REM     start "Remote DB Tunnel" /MIN ssh -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no -N -L 127.0.0.1:5434:127.0.0.1:5434 user@remote-host
REM     timeout /t 2 /nobreak >nul
REM )

REM Configura qui i percorsi locali per Java e Maven se non presenti nel PATH di sistema
REM set "JAVA_HOME=C:\Program Files\Java\jdk-21"
REM set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Starting Spring Boot Backend...
cd backend
call mvn spring-boot:run
