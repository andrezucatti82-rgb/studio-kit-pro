@echo off
cd /d "%~dp0"
if exist ".studio-tools\node\node.exe" set "PATH=%~dp0.studio-tools\node;%PATH%"
set "PATH=%ProgramFiles%\Git\cmd;%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if "%~1"=="codex" (codex -c mcp_servers.studio_curadoria.command=node -c "mcp_servers.studio_curadoria.args=['tools/curadoria/mcp.mjs']" & exit /b)
if "%~1"=="claude" (claude & exit /b)
if "%~1"=="atlas" (node scripts\serve-atlas.mjs & exit /b)
if "%~1"=="doctor" (node scripts\doctor.mjs & exit /b)
if "%~1"=="tools" (node scripts\free-tools.mjs %* & exit /b)
echo Use: STUDIO.cmd codex ^| claude ^| atlas ^| doctor ^| tools doctor
echo Tutorial: docs\COMECE-AQUI.html
