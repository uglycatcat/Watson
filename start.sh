#!/usr/bin/env bash
# Watson：完整模式（install + build + 预览）或快速模式（仅 npx vite preview）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

HOST="127.0.0.1"
PORT="4173"
URL="http://${HOST}:${PORT}/"

print_help() {
  cat <<'EOF'
用法: ./start.sh [选项]

  （无参数）   若存在 dist/ 则询问「完整 / 快速」；否则自动完整流程
  --full, -f   npm install + npm run build + 预览
  --quick, -q  仅 npx vite preview（需已有 dist/ 与 node_modules/）
  --help, -h   显示本说明
EOF
}

RUN_FULL=""
for arg in "$@"; do
  case "$arg" in
    --help | -h)
      print_help
      exit 0
      ;;
    --full | -f)
      RUN_FULL=1
      ;;
    --quick | -q)
      RUN_FULL=0
      ;;
    *)
      echo "[错误] 未知参数: $arg （使用 --help 查看说明）"
      exit 1
      ;;
  esac
done

if [[ -n "${RUN_FULL}" && $# -gt 1 ]]; then
  echo "[错误] 请勿同时使用多个参数（见 --help）"
  exit 1
fi

if [[ -z "${RUN_FULL}" ]]; then
  if [[ -f dist/index.html ]]; then
    echo "[检测] 已存在 dist/"
    echo "  1) 完整：npm install + build + 预览"
    echo "  2) 快速：仅 npx vite preview（跳过 install 与 build）"
    read -r -p "请选择 [1/2]（默认 2）: " c
    c=${c:-2}
    case "$c" in
      1) RUN_FULL=1 ;;
      2) RUN_FULL=0 ;;
      *)
        echo "[错误] 无效输入"
        exit 1
        ;;
    esac
  else
    echo "[检测] 未找到 dist/，将执行完整流程"
    RUN_FULL=1
  fi
fi

for cmd in node npm; do
  command -v "$cmd" >/dev/null || {
    echo "[错误] 未找到 ${cmd}，请先安装 Node.js: https://nodejs.org/"
    exit 1
  }
done

if [[ "$RUN_FULL" -eq 1 ]]; then
  echo "==> [完整] npm install"
  npm install
  echo "==> [完整] npm run build"
  npm run build
else
  if [[ ! -f dist/index.html ]]; then
    echo "[错误] 快速模式需要 dist/，请先执行: $0 --full"
    exit 1
  fi
  if [[ ! -d node_modules ]]; then
    echo "[错误] 快速模式需要 node_modules/，请先执行: $0 --full"
    exit 1
  fi
  echo "==> [快速] 跳过 install 与 build，直接预览"
fi

wait_for_port() {
  local n=0
  while ((n < 60)); do
    if command -v nc >/dev/null 2>&1 && nc -z "$HOST" "$PORT" 2>/dev/null; then
      return 0
    fi
    if bash -c "echo >/dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
      return 0
    fi
    sleep 0.25
    ((n += 1)) || true
  done
  return 1
}

echo "==> 启动预览 ${URL}"
npx vite preview --host "$HOST" --port "$PORT" &
PREVIEW_PID=$!

cleanup() {
  kill "$PREVIEW_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if wait_for_port; then
  if command -v xdg-open >/dev/null; then
    xdg-open "$URL" || true
  elif command -v sensible-browser >/dev/null; then
    sensible-browser "$URL" || true
  else
    echo "请手动在浏览器打开: ${URL}"
  fi
else
  echo "[警告] 等待端口超时，请手动打开: ${URL}"
fi

echo "预览运行中，Ctrl+C 停止服务"
wait "$PREVIEW_PID"
