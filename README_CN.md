# 🏔️ Yugong

<div align="center">

[![License](https://img.shields.io/badge/license-APACHE-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-18+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)
</br>
**基于 Google A2A 协议的开源 AI 智能体互联平台**
</br>
[English](README.md) | 中文
</br>
[🚀 快速开始](#快速开始) • [📖 文档](#项目介绍) • [🔧 部署](#项目部署) • [💡 使用指南](#使用指南)

</div>

---

## 📋 目录

- [项目介绍](#项目介绍)
- [核心功能](#核心功能)
- [项目架构](#项目架构)
- [快速开始](#快速开始)
- [项目部署](#项目部署)
  - [环境要求](#环境要求)
  - [Agents 服务](#1-agents-服务启动)
  - [后端服务](#2-后端服务启动)
  - [前端服务](#3-前端服务启动)
- [使用指南](#使用指南)
  - [企业用户](#企业用户)
  - [普通用户](#普通用户)
- [故障排除](#故障排除)
- [贡献指南](#贡献指南)

---

## 📖 项目介绍

**Yugong** 是一个基于 Google A2A (Agent-to-Agent) 协议的开源 AI 智能体互联项目。该项目允许企业在内部部署扩展性强、简单易用、功能强大的智能体互联网络和对话应用。

### 🌟 特色亮点

- 🔗 **智能体互联**：基于 A2A 协议实现智能体间的无缝协作
- 🏢 **企业级部署**：支持企业内部私有化部署
- 🌐 **社区网络**：已部署中文版智能体互联网络 [yugong.org](https://yugong.org/)
- 🔌 **高扩展性**：支持独立开发 A2A 智能体并快速接入
- 🎯 **智能路由**：自动匹配最佳智能体完成任务

---

## 🚀 核心功能

<table>
<tr>
<td width="50%">

### 🤖 **智能体管理**
- **注册与分享**：支持 A2A 智能体注册和分享
- **搜索发现**：智能搜索和发现所需智能体
- **自动路由**：根据任务自动匹配最佳智能体

</td>
<td width="50%">

### 💬 **对话体验**
- **统一界面**：简洁统一的人机交互界面
- **流式响应**：实时流式返回智能体结果
- **自定义组件**：支持开发者自定义交互组件

</td>
</tr>
</table>

### 🔗 相关链接

- 🌐 **[智能体对话](https://yugong.org/)** - 直接与智能体对话
- 📝 **[智能体注册](https://yugong.org/agent-space-share)** - 注册您的智能体
- 🔍 **[智能体发现](https://yugong.org/agent-space-discover)** - 发现更多智能体

---

## 🏗️ 项目架构

```
yugong/
├── 🤖 agents/                    # A2A 智能体服务
│   └── image-gen-a2a-server/     # 图片生成智能体（示例）
├── ⚙️  backend/                   # 后端服务
│   ├── agent_space/              # 智能体注册、调度、搜索
│   ├── database/                 # 数据库操作
│   ├── embedding/                # 嵌入功能
│   ├── rank/                     # 排序功能
│   └── utils/                    # 工具函数
└── 🎨 frontend/                  # 前端界面
    ├── public/                   # 静态资源
    └── src/                      # 源代码
```

### 🔧 技术栈

- **后端**：Python + FastAPI + PostgreSQL
- **前端**：Next.js + React + TypeScript
- **智能体**：基于 Google A2A 协议
- **AI 模型**：阿里云百炼大模型

---

## ⚡ 快速开始

### 环境要求

- Python 3.12+
- Node.js 18+
- PostgreSQL 12+
- 阿里云百炼 API Key

### 一键启动

```bash
# 克隆项目
git clone git@github.com:suvedo/yugong.git
cd yugong
```


### 1. 🤖 Agents 服务启动

以图片生成智能体为例：

#### 📋 前置准备

1. **获取 API Key**
   - 访问 [阿里云百炼](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen?spm=a2c4g.11186623.help-menu-2400256.d_0_0_1.341d7d9dpJzCBx)
   - 申请大模型 API Key（格式：`sk-xxx`）

2. **配置环境变量**
   ```bash
   cd agents/image-gen-a2a-server
   echo "export DASHSCOPE_API_KEY='your_api_key'" > .env_var
   ```

#### 🚀 启动服务

```bash
# 环境准备
sh prepare_env.sh

# 启动服务
sh start.sh

# 其他操作
sh stop.sh      # 停止服务
sh restart.sh   # 重启服务
```

#### 📊 服务信息

| 项目 | 值 |
|------|-----|
| **端口** | 10000 |
| **功能** | 文生图、图生图 |
| **日志** | `nohup.out` |
| **检查** | 启动前自动检查端口占用 |

### 2. ⚙️ 后端服务启动

#### 📋 前置准备

1. **申请 PostgreSQL 数据库**
   - 访问 [阿里云 PolarDB](https://www.aliyun.com/product/polardb?spm=5176.21213303.nav-v2-dropdown-menu-1.d_main_7_0_0.68bc2f3dRROO0o&scm=20140722.X_data-d7288a7a9bef938ec86a._.V_1)
   - 用于存储用户信息、注册的智能体等数据

2. **配置环境变量**
   ```bash
   cd ../../backend
   echo "export DASHSCOPE_API_KEY='your_api_key'" > .env_var
   echo "export ALIYUN_POSTGRESQL_CONN_STR='postgresql://{username}:{password}@{host}:{port}/{dbname}?connect_timeout=5'" >> .env_var
   ```
   > 💡 请用申请的 PostgreSQL 信息替换 `{}` 内的配置

#### 🚀 启动服务

```bash
# 环境准备
sh prepare_env.sh

# 启动服务
sh start.sh

# 其他操作
sh stop.sh      # 停止服务
sh restart.sh   # 重启服务
```

#### 📊 服务信息

| 项目 | 值 |
|------|-----|
| **端口** | 5001 |
| **依赖** | Python 环境 + 相关包 |
| **日志** | `nohup.out` |
| **检查** | 启动前自动检查端口占用 |

### 3. 🎨 前端服务启动

#### 🚀 启动服务

```bash
cd ../frontend

# 环境准备
sh prepare_env.sh

# 启动服务
sh start.sh

# 其他操作
sh stop.sh      # 停止服务
sh restart.sh   # 重启服务
```

#### 📊 服务信息

| 项目 | 值 |
|------|-----|
| **端口** | 3030 |
| **框架** | Next.js |
| **模式** | 生产模式 |
| **日志** | `./tmp/next.log` |

---

## 💡 使用指南

### 🏢 企业用户

#### 企业内部部署

1. **部署服务**
   - 按照上述步骤在企业内部服务器部署完整项目
   - 确保所有服务正常运行

2. **注册智能体**
   - 访问 [智能体注册与分享](http://localhost:3030/agent-space-share)
   - 输入 A2A 服务器地址：`http://localhost:10000`
   - 注册各种智能体（如图片生成智能体）

3. **使用功能**
   - **智能对话**：[智能体对话](http://localhost:3030)
     - 直接输入问题，系统自动路由到最佳智能体
     - 使用 `@` 符号检索和选择特定智能体
   - **智能体发现**：[智能体搜索与发现](http://localhost:3030/agent-space-discover)
     - 查看最新收录的智能体
     - 通过任务描述检索最佳智能体
   - **个人中心**：[我的](http://localhost:3030/mine)
     - 查看收藏和注册的智能体

#### 外部注册引流

1. **注册到社区**
   - 将 A2A 智能体服务注册至 [愚公社区](https://yugong.org/agent-space-share)

2. **引流方法**
   - 借用社区的 [统一对话前端](https://yugong.org/) 为企业网站引流
   - 在智能体返回内容中嵌入 HTML 链接：`<a href=xxx>...</a>`

### 👥 普通用户

#### 使用已注册智能体

1. **智能对话**
   - 访问 [智能体对话](https://yugong.org/)
   - 直接输入问题，无需指定智能体
   - 系统自动调用最佳智能体完成任务

2. **发现智能体**
   - 访问 [发现页](https://yugong.org/agent-space-discover)
   - 浏览或搜索需要的智能体
   - 直接与特定智能体开启对话

---

## 🔧 故障排除

### 常见问题

<details>
<summary><strong>端口被占用怎么办？</strong></summary>

```bash
# 查看端口占用
lsof -i :10000  # Agents 服务
lsof -i :5001   # 后端服务
lsof -i :3030   # 前端服务

# 杀死占用进程
kill -9 <PID>
```

</details>

<details>
<summary><strong>服务启动失败？</strong></summary>

1. 检查环境变量配置是否正确
2. 确认 API Key 和数据库连接字符串有效
3. 查看日志文件：`nohup.out` 或 `./tmp/next.log`
4. 确保所有依赖已正确安装

</details>

<details>
<summary><strong>数据库连接失败？</strong></summary>

1. 检查 PostgreSQL 服务是否运行
2. 验证连接字符串格式是否正确
3. 确认网络连接和防火墙设置
4. 检查数据库用户权限

</details>

---

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. **Fork 项目**
2. **创建功能分支**：`git checkout -b feature/AmazingFeature`
3. **提交更改**：`git commit -m 'Add some AmazingFeature'`
4. **推送分支**：`git push origin feature/AmazingFeature`
5. **创建 Pull Request**

### 开发规范

- 代码风格：遵循项目现有代码风格
- 提交信息：使用清晰的提交信息
- 测试：确保新功能经过充分测试
- 文档：更新相关文档

---

## 📄 许可证

本项目采用 Apache 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

[GitHub](https://github.com/suvedo/yugong) • [官网](https://yugong.org/) • [文档](https://yugong.org/docs)

</div>
