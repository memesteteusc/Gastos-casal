@echo off
chcp 65001 >nul
title CursoFlix

echo.
echo  ██████╗██╗   ██╗██████╗ ███████╗ ██████╗ ███████╗██╗     ██╗██╗  ██╗
echo ██╔════╝██║   ██║██╔══██╗██╔════╝██╔═══██╗██╔════╝██║     ██║╚██╗██╔╝
echo ██║     ██║   ██║██████╔╝███████╗██║   ██║█████╗  ██║     ██║ ╚███╔╝
echo ██║     ██║   ██║██╔══██╗╚════██║██║   ██║██╔══╝  ██║     ██║ ██╔██╗
echo ╚██████╗╚██████╔╝██║  ██║███████║╚██████╔╝██║     ███████╗██║██╔╝ ██╗
echo  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝╚═╝  ╚═╝
echo.
echo  Gerenciador de Aulas em Video
echo  ================================
echo.

cd /d "%~dp0"

:: ─── Verifica Node.js ───────────────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado no seu computador!
    echo.
    echo  Por favor, siga estes passos:
    echo  1. Abra o navegador e acesse: https://nodejs.org
    echo  2. Clique no botao verde "LTS" para baixar
    echo  3. Abra o arquivo baixado e clique em "Next" ate o fim
    echo  4. Feche e abra de novo este arquivo INICIAR.bat
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado.

:: ─── Instala dependencias do backend ────────────────────────────────────────
if not exist "backend\node_modules\" (
    echo.
    echo [1/3] Instalando dependencias do servidor...
    echo       (Isso so acontece na primeira vez - aguarde)
    cd backend
    npm install --silent
    cd ..
    echo [OK] Dependencias instaladas.
)

:: ─── Instala dependencias do frontend ───────────────────────────────────────
if not exist "frontend\node_modules\" (
    echo.
    echo [2/3] Instalando dependencias do app visual...
    cd frontend
    npm install --silent
    cd ..
    echo [OK] Dependencias do frontend instaladas.
)

:: ─── Build do frontend ───────────────────────────────────────────────────────
if not exist "frontend\dist\" (
    echo.
    echo [3/3] Preparando o app visual...
    cd frontend
    npm run build
    cd ..
    echo [OK] App visual preparado.
)

:: ─── Cria .env se nao existir ────────────────────────────────────────────────
if not exist "backend\.env" (
    echo ANTHROPIC_API_KEY=> backend\.env
    echo PORT=3001>> backend\.env
)

:: ─── Inicia o servidor ───────────────────────────────────────────────────────
echo.
echo [OK] Iniciando CursoFlix...
echo.

cd backend
set NODE_ENV=production

:: Para qualquer instancia anterior
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

start /b node server.js > ..\cursoflix.log 2>&1

:: Aguarda o servidor subir
timeout /t 3 /nobreak >nul

:: Verifica se subiu
curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] O servidor nao conseguiu iniciar.
    echo Veja o arquivo cursoflix.log para detalhes.
    pause
    exit /b 1
)

:: ─── Abre o navegador ────────────────────────────────────────────────────────
echo  ✅ CursoFlix aberto no navegador!
echo.
echo  Se o navegador nao abrir automaticamente,
echo  acesse manualmente: http://localhost:3001
echo.
echo  ⚠  NAO FECHE ESTA JANELA enquanto estiver usando o app.
echo     Para sair, feche esta janela ou pressione qualquer tecla.
echo.

start http://localhost:3001

pause

:: ─── Encerra o servidor ao fechar ────────────────────────────────────────────
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo Servidor encerrado. Ate logo!
