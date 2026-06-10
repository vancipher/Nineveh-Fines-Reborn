@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Using Node:
node -v
call npm rebuild better-sqlite3
if errorlevel 1 exit /b 1
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
if errorlevel 1 exit /b 1
echo Native modules ready for system Node.js.
endlocal
