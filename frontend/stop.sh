#!/bin/bash

# 根据系统类型选择不同的端口占用进程检测方式
PORT="${PORT:-3030}"
OS_NAME="$(uname -s)"
PIDS=""

case "$OS_NAME" in
  Darwin)
    # macOS 使用 lsof
    if command -v lsof >/dev/null 2>&1; then
      PIDS="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
    fi
    ;;
  Linux)
    # Linux 优先使用 ss，其次 netstat，最后回退到 lsof
    if command -v ss >/dev/null 2>&1; then
      PIDS="$(ss -ltnp 2>/dev/null | awk -v port=":${PORT}" '$4 ~ port {print $NF}' | sed -n 's/.*pid=\([0-9]\+\),.*/\1/p')"
    elif command -v netstat >/dev/null 2>&1; then
      PIDS="$(netstat -tulnp 2>/dev/null | awk -v port=":${PORT}" '$4 ~ port {split($7,a,"/"); print a[1]}')"
    elif command -v lsof >/dev/null 2>&1; then
      PIDS="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
    fi
    ;;
  *)
    # 其他系统尽量用 lsof 作为兜底
    if command -v lsof >/dev/null 2>&1; then
      PIDS="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
    fi
    ;;
esac

if [ -n "${PIDS:-}" ]; then
  echo "Killing processes on port ${PORT}: ${PIDS}"
  # 直接传参可一次性杀多个 PID；若为空则不会执行
  kill -9 $PIDS
fi

# 检查 PID 文件是否存在
if [ ! -f "./tmp/next.pid" ]; then
    echo " PID file not found, service seems not to be running."
    exit 0
fi

# 读取 PID
PID=$(cat ./tmp/next.pid)

# 检查进程是否存在
if ps -p $PID > /dev/null; then
    echo "stopping Next.js service..."
    kill $PID
    rm ./tmp/next.pid
    echo "Next.js stopped successfully!"
else
    echo "Next.js not running"
    rm ./tmp/next.pid
fi