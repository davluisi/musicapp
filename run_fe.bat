@echo off
echo Starting MusicApp Frontend...
echo.

set "PATH=C:\Users\david\AppData\Local\nvm\v24.14.1;%PATH%"
cd frontend
echo Starting Expo development server...
call "C:\Users\david\AppData\Local\nvm\v24.14.1\npm.cmd" start
