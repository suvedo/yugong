#!/bin/sh

# Ubuntu Node.js环境检测与安装脚本
# 功能：检测nvm/node/npm安装状态，并按最佳实践完成安装
# 依赖：curl, git

# 检测nvm安装状态
check_nvm_installed() {
    if command -v nvm >/dev/null 2>&1; then
        echo "[detect] nvm installed (version: $(nvm --version))" >&2
        return 0
    elif [ -d "$HOME/.nvm" ]; then
        echo "[detect] nvm dir exists but not configured, attempt to loading..." >&2
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        if command -v nvm >/dev/null 2>&1; then
            echo "[fix] nvm loading succeed (version: $(nvm --version))" >&2
            return 0
        fi
    fi
    echo "[detect] nvm not installed" >&2
    return 1
}

# 检测Node.js安装状态
check_node_installed() {
    if command -v node >/dev/null 2>&1; then
        echo "[detect] Node.js installed (version: $(node -v))" >&2
        return 0
    fi
    echo "[detect] Node.js not installed" >&2
    return 1
}

# 检测npm安装状态
check_npm_installed() {
    if command -v npm >/dev/null 2>&1; then
        echo "[detect] npm installed (version: $(npm -v))" >&2
        return 0
    fi
    echo "[detect] npm not installed" >&2
    return 1
}

# 安装nvm
install_nvm() {
    echo "[install] installing nvm..." >&2
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | sh
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
    
    if ! command -v nvm >/dev/null 2>&1; then
        echo "[error] failed to install nvm! run it manully:" >&2
        echo "  source ~/.bashrc or restart terminal" >&2
        return 1
    fi
    echo "[succeed] nvm installed (version: $(nvm --version))" >&2
}

# 通过nvm安装Node.js和npm
install_node_with_nvm() {
    echo "[install] installing Node.js==v18.20.8..." >&2
    nvm install 18.20.8
    nvm use 18.20.8
    #nvm alias default 'lts/*'
    
    if ! command -v node >/dev/null 2>&1; then
        echo "[error] Node.js failed to install!" >&2
        return 1
    fi
    echo "[succeed] Node.js installed (version: $(node -v))" >&2
    echo "[succeed] npm installed (version: $(npm -v))" >&2
}

# 配置npm优化设置
configure_npm() {
    echo "[configure] opt npm conf..." >&2
    # 设置全局安装路径避免权限问题
    mkdir -p ~/.npm-global
    npm config set prefix '~/.npm-global'
    
    # 配置环境变量
    echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
    . ~/.bashrc
    
    # 更新npm至最新版
    npm install -g npm@latest > /dev/null
    echo "[configure] npm updated to newest(version: $(npm -v))" >&2
}

# 主执行流程
main() {
    echo "=== start detecting Node.js env ==="
    
    # 检测基础依赖
    if ! command -v curl >/dev/null 2>&1; then
        echo "[dependency] install curl..." >&2
        sudo apt update && sudo apt install -y curl git
    fi
    
    # 环境检测
    check_nvm_installed || {
        install_nvm || exit 1
    }
    
    # 加载nvm环境
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    
    check_node_installed || check_npm_installed || {
        install_node_with_nvm || exit 1
    }
    
    # 配置npm
    #configure_npm
    
    echo "=== env verification finished ==="
    echo "nvm version: $(command -v nvm >/dev/null 2>&1 && nvm --version || echo 'not installed')"
    echo "Node.js version: $(command -v node >/dev/null 2>&1 && node -v || echo 'not installed')"
    echo "npm version: $(command -v npm >/dev/null 2>&1 && npm -v || echo 'not installed')"
    echo "=== install finished ==="
    echo "tips: restart terminal or  run source ~/.bashrc to enable configuration"
}

main "$@"

echo "[install] install dependencies for this project..." >&2
npm install