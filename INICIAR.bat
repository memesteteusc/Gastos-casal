@echo off
chcp 65001 >nul
title CursoFlix — Iniciando...

cd /d "%~dp0"

echo.
echo  ==========================================
echo   CursoFlix - Gerenciador de Aulas
echo  ==========================================
echo.

:: ─── Verifica Node.js ───────────────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao esta instalado!
    echo.
    echo  Faca isso:
    echo  1. Abra o Chrome
    echo  2. Acesse: https://nodejs.org
    echo  3. Clique no botao verde "LTS"
    echo  4. Instale e volte a clicar no INICIAR.bat
    echo.
    pause
    exit /b 1
)

echo  [1/4] Node.js encontrado. OK
echo.

:: ─── Instala dependencias backend ───────────────────────────────────────────
if not exist "backend\node_modules\" (
    echo  [2/4] Instalando componentes do servidor...
    echo        Aguarde, pode demorar alguns minutos na 1a vez...
    echo.
    cd backend
    npm install
    cd ..
    echo.
    echo  Componentes instalados. OK
) else (
    echo  [2/4] Componentes do servidor. OK
)

:: ─── Build frontend se nao existir ──────────────────────────────────────────
if not exist "frontend\dist\index.html" (
    echo.
    echo  [3/4] Preparando a interface visual...
    if not exist "frontend\node_modules\" (
        cd frontend
        npm install
        cd ..
    )
    cd frontend
    npm run build
    cd ..
    echo  Interface preparada. OK
) else (
    echo  [3/4] Interface visual. OK
)

:: ─── Cria .env se nao existir ────────────────────────────────────────────────
if not exist "backend\.env" (
    echo ANTHROPIC_API_KEY=> "backend\.env"
    echo PORT=3001>> "backend\.env"
)

:: ─── Para servidor anterior se existir ──────────────────────────────────────
echo.
echo  [4/4] Iniciando servidor...

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001"') do (
    taskkill /f /pid %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

:: ─── Inicia o servidor ───────────────────────────────────────────────────────
cd backend
set NODE_ENV=production
start "CursoFlix-Servidor" /min node server.js
cd ..

:: ─── Aguarda o servidor subir (10 segundos) ──────────────────────────────────
echo.
echo  Aguardando servidor iniciar...
timeout /t 5 /nobreak >nul

:: ─── Tenta abrir o navegador de varias formas ────────────────────────────────
echo.
echo  Abrindo navegador...

:: Tenta Chrome primeiro
start "" "http://localhost:3001"

timeout /t 2 /nobreak >nul

:: ─── Mostra instrucoes ───────────────────────────────────────────────────────
echo.
echo  ==========================================
echo.
echo   App rodando em: http://localhost:3001
echo.
echo   Se o navegador nao abriu automaticamente:
echo   1. Abra o Chrome manualmente
echo   2. Clique na barra de endereco
echo   3. Digite:  localhost:3001
echo   4. Aperte Enter
echo.
echo  ==========================================
echo.
echo   IMPORTANTE: Nao feche esta janela!
echo   O app para de funcionar se fechar.
echo.
echo  Para encerrar o CursoFlix: feche esta janela
echo  ==========================================
echo.

pause

:: ─── Encerra servidor ────────────────────────────────────────────────────────
taskkill /f /im node.exe >nul 2>&1
echo Servidor encerrado.
