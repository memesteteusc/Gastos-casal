@echo off
cd /d "%~dp0"
echo Testando Node.js...
node --version
echo.
echo Se aparecer um numero acima (ex: v22.0.0) o Node esta OK.
echo Se aparecer erro, o Node nao esta funcionando.
echo.
echo Pasta atual:
cd
echo.
pause
