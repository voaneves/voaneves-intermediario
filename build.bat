@echo off
REM ============================================================
REM  voaneves.com - one-click build
REM  Double-click this file. It minifies JS, compiles SCSS,
REM  regenerates the inline critical-CSS, and bumps the SW
REM  version. When it's done, review `git diff` and commit.
REM ============================================================
cd /d "%~dp0"

echo.
echo === voaneves build ===
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js nao encontrado. Instale o LTS em https://nodejs.org e rode de novo.
  echo.
  pause
  exit /b 1
)

echo Verificando ferramentas de build ^(rapido se ja estiver instalado^)...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install falhou.
  pause
  exit /b 1
)
echo.

node build.js
set BUILD_EXIT=%errorlevel%

echo.
if %BUILD_EXIT%==0 (
  echo Pronto. Confira o `git diff`, depois commit + push.
) else (
  echo [ERROR] O build falhou ^(veja a mensagem acima^).
)
echo.
pause
