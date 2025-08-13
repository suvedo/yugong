#!/bin/bash

# 检测端口是否可用的函数（支持多系统）
check_port() {
    local port=$1
    local max_attempts=$2
    local attempt=1
    
    # 检测操作系统类型
    detect_os() {
        case "$(uname -s)" in
            Darwin*)    echo "macos" ;;    # macOS
            Linux*)     echo "linux" ;;    # Linux
            CYGWIN*|MINGW32*|MSYS*|MINGW*) echo "windows" ;; # Windows
            *)          echo "unknown" ;;
        esac
    }
    
    # 根据操作系统选择端口检测命令
    get_port_check_command() {
        local os=$(detect_os)
        case $os in
            "macos")
                echo "lsof -i :$1 > /dev/null 2>&1"
                ;;
            "linux")
                echo "netstat -tuln | grep -q ':$1 '"
                ;;
            "windows")
                echo "netstat -an | findstr ':$1 ' > nul 2>&1"
                ;;
            *)
                # 通用方法，尝试多种命令
                if command -v lsof > /dev/null 2>&1; then
                    echo "lsof -i :$1 > /dev/null 2>&1"
                elif command -v netstat > /dev/null 2>&1; then
                    echo "netstat -tuln | grep -q ':$1 '"
                elif command -v ss > /dev/null 2>&1; then
                    echo "ss -tuln | grep -q ':$1 '"
                else
                    echo "echo 'cannot find available command to detect port' && false"
                fi
                ;;
        esac
    }
    
    local check_cmd=$(get_port_check_command $port)
    
    while [ $attempt -le $max_attempts ]; do
        if eval $check_cmd; then
            return 0
        else
            # echo "⏳ attempt $attempt/$max_attempts: port $port not started, keep waiting..."
            sleep 2
            attempt=$((attempt + 1))
        fi
    done
    
    return 1
}

if check_port 5001 1; then
    echo "port 5001 is occupied, run restart.sh to restart service"
    echo "❌ service failed to start"
    exit 1
fi

# 启动后端服务
echo "starting backend service..."

source ~/.bashrc
source .venv/bin/activate

# 启动服务
nohup uvicorn app:app --host 0.0.0.0 --port 5001 > nohup.out 2>&1 &

# 获取进程ID
PID=$!
echo "process ID: $PID"

# 等待服务启动
echo "waiting service to start..."
sleep 5

# 检测5001端口
if check_port 5001 30; then
    echo "✅ backend service started"
    echo "service on http://localhost:5001"
    echo "process ID: $PID"
else
    echo "❌ service failed to start"
    echo "check nohup.out to get detail info"
    exit 1
fi