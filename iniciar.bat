@echo off
setlocal
title RetroVault - Servidor local
set "RETRO_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
 if exist "C:\Program Files\nodejs\node.exe" (
  set "RETRO_NODE=C:\Program Files\nodejs\node.exe"
 ) else (
  echo Instale o Node.js 20 ou superior para iniciar.
  pause
  exit /b 1
 )
)
"%RETRO_NODE%" "%~dp0server\iniciar.js"
echo O servidor foi encerrado.
pause
