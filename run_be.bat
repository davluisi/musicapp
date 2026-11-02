@echo off
echo Starting MusicApp Backend...
echo.

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
set "PATH=%JAVA_HOME%\bin;C:\Users\david\tools\apache-maven-3.9.6\bin;%PATH%"

echo Starting Spring Boot Backend...
cd backend
call mvn spring-boot:run
