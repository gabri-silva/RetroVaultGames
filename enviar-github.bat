@echo off
setlocal
title RetroVault - Enviar para GitHub
set "RETRO_GIT=git"
where git >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\Git\cmd\git.exe" (
    set "RETRO_GIT=C:\Program Files\Git\cmd\git.exe"
  ) else (
    echo Git nao encontrado neste PC.
    pause
    exit /b 1
  )
)
echo Enviando a versao preparada para o repositorio RetroVaultGames...
echo Se o GitHub pedir login, entre com a conta que tem acesso ao repositorio.
"%RETRO_GIT%" -C "%~dp0." push -u origin main
if errorlevel 1 (
  echo O envio nao foi concluido. Consulte a mensagem acima.
) else (
  echo Projeto enviado com sucesso para o GitHub.
)
pause
