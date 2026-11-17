@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0install.ps1" %*
if errorlevel 1 echo A instalacao parou. Consulte o erro acima e LEIA-PRIMEIRO.html.
pause
