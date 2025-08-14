source .env_var

# 构建生产环境代码（生产模式）
echo "Building production code..."
npm run build

sh stop.sh

# 确保 tmp 目录存在
mkdir -p tmp

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