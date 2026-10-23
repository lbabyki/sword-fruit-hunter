@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Can cai Node.js 22 tro len truoc khi chay.
 pause
 exit /b 1
)
if not exist node_modules (
 echo Dang cai npm packages...
 call npm install
 if errorlevel 1 (
   echo Loi npm install. Kiem tra ket noi Internet.
   pause
   exit /b 1
 )
)
echo Mo http://localhost:5173 tren Chrome hoac Edge.
call npm run dev
pause
