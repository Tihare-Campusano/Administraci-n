@echo off
title FoodAdmin - Escritorio
echo ==================================================
echo   Iniciando FoodAdmin de Escritorio...
echo ==================================================
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
call npm run desktop
