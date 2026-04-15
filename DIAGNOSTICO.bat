@echo off
chcp 65001 >nul
title CursoFlix — Diagnostico
cd /d "%~dp0"

echo.
echo =============================================
echo  DIAGNOSTICO CURSOFLIX
echo =============================================
echo.

:: Teste 1: Node.js
echo [TESTE 1] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  RESULTADO: Node.js NAO instalado.
    echo.
    echo  SOLUCAO: Vou abrir o site para baixar agora.
    echo  Quando abrir o site, clique no botao verde LTS,
    echo  baixe e instale. Depois rode este arquivo de novo.
    echo.
    pause
    start https://nodejs.org
    exit /b
) else (
    for /f %%v in ('node --version') do echo  RESULTADO: OK — versao %%v
)

echo.

:: Teste 2: Pasta backend
echo [TESTE 2] Verificando pasta backend...
if not exist "backend\server.js" (
    echo  RESULTADO: PASTA ERRADA!
    echo.
    echo  Voce esta rodando o arquivo do lugar errado.
    echo  Certifique-se de que o DIAGNOSTICO.bat esta dentro
    echo  da pasta "Gastos-casal-..." que voce extraiu do ZIP.
    echo.
    pause
    exit /b
) else (
    echo  RESULTADO: OK
)

echo.

:: Teste 3: Dependencias
echo [TESTE 3] Verificando dependencias...
if not exist "backend\node_modules\" (
    echo  RESULTADO: Nao instaladas. Instalando agora...
    cd backend
    npm install
    cd ..
    echo  RESULTADO: Instaladas com sucesso.
) else (
    echo  RESULTADO: OK
)

echo.

:: Teste 4: Frontend compilado
echo [TESTE 4] Verificando interface visual...
if not exist "frontend\dist\index.html" (
    echo  RESULTADO: Nao compilada. Compilando agora...
    if not exist "frontend\node_modules\" (
        cd frontend && npm install && cd ..
    )
    cd frontend && npm run build && cd ..
    echo  RESULTADO: Compilada com sucesso.
) else (
    echo  RESULTADO: OK
)

echo.

:: Teste 5: Porta 3001
echo [TESTE 5] Verificando porta 3001...
netstat -aon | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo  RESULTADO: Porta ja em uso. Liberando...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    echo  RESULTADO: Porta liberada.
) else (
    echo  RESULTADO: OK, porta livre.
)

echo.

:: Cria .env
if not exist "backend\.env" (
    echo ANTHROPIC_API_KEY=> "backend\.env"
    echo PORT=3001>> "backend\.env"
)

:: Inicia servidor
echo [INICIANDO] Abrindo servidor...
cd backend
set NODE_ENV=production
start "Servidor-CursoFlix" /min cmd /c "node server.js & pause"
cd ..

echo  Aguardando 6 segundos...
timeout /t 6 /nobreak >nul

echo.
echo =============================================
echo  TUDO PRONTO!
echo.
echo  Abrindo navegador em: http://localhost:3001
echo =============================================
echo.

:: Tenta abrir navegador de 3 formas diferentes
start "" "http://localhost:3001"
timeout /t 1 /nobreak >nul
explorer "http://localhost:3001"

echo.
echo  Se o navegador NAO abrir:
echo  1. Abra o Chrome
echo  2. Na barra de endereco escreva: localhost:3001
echo  3. Aperte Enter
echo.
echo  NAO feche esta janela!
echo.
pause
taskkill /f /im node.exe >nul 2>&1
