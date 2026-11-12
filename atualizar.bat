@echo off
REM Uso:  atualizar "o que mudou"
git add .
git commit -m "%~1"
git push
echo.
echo Enviado! A Vercel publica sozinha em ~1 minuto.
