@echo off
cd /d "%~dp0"
if exist ".studio-tools\node\node.exe" set "PATH=%~dp0.studio-tools\node;%PATH%"
set "PATH=%ProgramFiles%\Git\cmd;%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if "%~1"=="codex" (codex & exit /b)
if "%~1"=="claude" (claude & exit /b)
if "%~1"=="atlas" (node scripts\serve-atlas.mjs & exit /b)
if "%~1"=="doctor" (node scripts\doctor.mjs & exit /b)
echo Use: STUDIO.cmd codex ^| claude ^| atlas ^| doctor
echo Tutorial: docs\COMECE-AQUI.html
