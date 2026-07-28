@echo off
title FoodAdmin - Escritorio
echo ==================================================
echo   Iniciando FoodAdmin de Escritorio...
echo ==================================================
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
:: Iniciar el servidor de sincronizacion local en segundo plano
start "" /b python server.py --sync-only
call npm run desktop
