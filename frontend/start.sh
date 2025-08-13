#!/bin/bash

# 检查是否已经在运行
if [ -f "./tmp/next.pid" ]; then
    echo "Next.js seem to be running. Please run restart.sh"
    exit 1
fi

# 确保 tmp 目录存在
mkdir -p tmp

# ln -snf .env.local.prod .env.local

# 启动 Next.js 服务（开发模式）
# echo "Starting Next.js service..."
# nohup npm run dev > ./tmp/next.log 2>&1 & echo $! > ./tmp/next.pid


# 构建生产环境代码（生产模式）
echo "Building production code..."
npm run build
echo "Starting production server..."
NODE_ENV=production nohup npm run start -- -p 3030 > ./tmp/next.log 2>&1 & echo $! > ./tmp/next.pid

# 等待服务启动
sleep 10

# 检查服务是否成功启动
if curl -s http://localhost:3030 > /dev/null; then
    echo "Next.js started successfully!"
    echo "Visit http://server_ip:3030 to have fun"
    echo "Check ./tmp/next.log for service logs"
    echo "To stop the service, run: kill \$(cat ./tmp/next.pid)"
else
    echo "Next.js failed to start!"
    cat ./tmp/next.log
    rm ./tmp/next.pid
fi