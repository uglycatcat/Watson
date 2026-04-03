@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set HOST=127.0.0.1
set PORT=4173
set URL=http://%HOST%:%PORT%/

where node >nul 2>nul || (echo [错误] 请先安装 Node.js: https://nodejs.org/ & exit /b 1)
where npm >nul 2>nul || (echo [错误] 未找到 npm & exit /b 1)

if /i "%~1"=="--help" goto :help
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--full" goto :arg_full
if /i "%~1"=="-f" goto :arg_full
if /i "%~1"=="--quick" goto :arg_quick
if /i "%~1"=="-q" goto :arg_quick
if not "%~1"=="" (
  echo [错误] 未知参数: %~1  （使用 start.bat --help^)
  exit /b 1
)

if exist dist\index.html (
  echo [检测] 已存在 dist/
  echo   1 完整：npm install + build + 预览
  echo   2 快速：仅 npx vite preview（跳过 install 与 build^)
  choice /c 12 /n /t 12 /d 2 /m "请选择 [1/2]，12 秒内未按则默认 2—快速: "
  if errorlevel 2 (
    set RUN_FULL=0
  ) else (
    set RUN_FULL=1
  )
) else (
  echo [检测] 未找到 dist/，将执行完整流程
  set RUN_FULL=1
)
goto :run

:arg_full
if not "%~2"=="" (
  echo [错误] 请勿同时使用多个参数（见 start.bat --help^)
  exit /b 1
)
set RUN_FULL=1
goto :run

:arg_quick
if not "%~2"=="" (
  echo [错误] 请勿同时使用多个参数（见 start.bat --help^)
  exit /b 1
)
set RUN_FULL=0
goto :run

:help
echo 用法: start.bat [选项]
echo   （无参数）   若存在 dist 则选 1/2；否则完整流程
echo   --full  -f   npm install + build + 预览
echo   --quick -q   仅 npx vite preview（需 dist 与 node_modules）
echo   --help  -h   本说明
exit /b 0

:run
if "!RUN_FULL!"=="0" (
  if not exist dist\index.html (
    echo [错误] 快速模式需要 dist/，请先: start.bat --full
    exit /b 1
  )
  if not exist node_modules (
    echo [错误] 快速模式需要 node_modules/，请先: start.bat --full
    exit /b 1
  )
  echo ==^> [快速] 跳过 install 与 build，直接预览
) else (
  echo ==^> [完整] npm install
  call npm install || exit /b 1
  echo ==^> [完整] npm run build
  call npm run build || exit /b 1
)

echo ==^> 启动预览 !URL!
start "Watson Preview" cmd /k "npx vite preview --host %HOST% --port %PORT%"

timeout /t 5 /nobreak >nul
start "" "!URL!"

echo.
echo 已尝试打开浏览器。关闭「Watson Preview」窗口即停止服务。
pause
endlocal
