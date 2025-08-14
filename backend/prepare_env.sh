#!/bin/bash

# 确保脚本在 bash 下运行（即使被 sh 调用）
if [ -z "$BASH_VERSION" ]; then
    exec bash "$0" "$@"
fi

source "$HOME/.bashrc" || source ~/.bashrc

# 检查 uv 是否已安装
check_uv_installed() {
    if command -v uv >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 安装 uv 的函数
install_uv() {
    echo "installing uv..."
    # 使用官方推荐的安装脚本
    # curl -LsSf https://astral.sh/uv/install.sh | sh
    # 使用pipx安装
    apt install pipx
    pipx install uv && pipx ensurepath
    source "$HOME/.bashrc" || source ~/.bashrc 
}

# 主逻辑
main() {
    if check_uv_installed; then
        echo "✓ uv installed"
    else
        echo "✗ uv not installed, ready to install..."
        install_uv
        # 验证安装结果
        if check_uv_installed; then
            echo "✓ uv installed!"
        else
            echo "❌ failed to install uv, install it manullly https://github.com/astral-sh/uv"
            exit 1
        fi
    fi
}

# 执行主函数
main


# 检查默认目录（.venv）
if [ -d ".venv" ]; then
    echo ".venv exists, skip"
else
    echo "start building env for this project"
    uv venv
fi
source .venv/bin/activate
echo "start installing requirements"
UV_HTTP_TIMEOUT=120 uv pip install -r requirements.txt