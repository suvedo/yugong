# yugong

<div align="center">
  <a href="README.md" style="padding: 8px 16px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">切换到英文版本</a>
</div>

---

## 项目简介

yugong 是一个基于 Google A2A (Agent-to-Agent) 协议的开源 AI 智能体平台项目。该项目允许企业用户在企业内部部署扩展性强、简单易用、功能强大的对话应用平台。此外，本社区已部署好一个(中文版)平台([点击跳转](https://yugong.org/))，企业可将自己开发的A2A智能体服务注册至该平台，个人用户可基于该平台的调度系统简单轻松地使用企业智能体。

## 项目功能介绍

1. **[智能体注册与分享](https://yugong.org/agent-space-share)**：支持基于 A2A 协议的 AI 智能体注册，为企业智能体网站引流
2. **[简单直接的智能体对话](https://yugong.org/)**：无需关心和指定智能体，平台会根据用户任务自动匹配并调用最佳智能体完成任务
3. **[智能体搜索与发现](https://yugong.org/agent-space-discover)**：用户可搜索或发现需要的智能体，并与该智能体发起对话
4. **统一简洁的人机交互界面**：综合市面上常见的智能体交互界面，提供统一的用户交互，并在智能体回答内容中提供灵活的开发者可自定义的交互组件（包括页面跳转引流等）
5. **高扩展/低耦合的智能体生态**：可独立开发 A2A 智能体，通过注册功能接入平台，丰富平台能力，实现高扩展/低耦合的智能体开发生态

## 项目结构介绍

```
yugong/
├── agents/ # 各种A2A智能体
│   └── image-gen-a2a-server/  # 图片生成 A2A 智能体（示例）
├── backend/  # 后端服务
│   ├── agent_space/  # 智能体注册、调度、搜索相关代码
│   ├── database/  # 数据库操作
│   ├── embedding/  # 嵌入功能
│   ├── rank/  # 排序功能
│   └── utils/  # 工具函数
└── frontend/  # 前端界面
    ├── public/  # 静态资源
    └── src/  # 源代码
```

## 平台部署步骤
### 0. 克隆项目
```bash
git clone git@github.com:suvedo/yugong.git
cd yugong
```
### 1. Agents 服务启动

以图片生成代理为例：

```bash
cd agents/image-gen-a2a-server
sh prepare_env.sh # 构建运行环境
sh start.sh # 启动服务
sh stop.sh  # 停止服务
sh restart.sh # 重启服务器
```

- 图片生成代理默认运行在 10000 端口
- 支持文生图和图生图功能
- 启动前会检查端口是否被占用
- 启动日志保存在 `nohup.out` 文件中

### 2. 后端服务启动

```bash
cd backend
sh prepare_env.sh # 构建运行环境
sh start.sh # 启动服务
sh stop.sh  # 停止服务
sh restart.sh # 重启服务器
```

- 后端服务默认运行在 5001 端口
- 依赖 Python 环境和相关包，通过 `prepare_env.sh` 脚本准备环境
- 启动前会检查端口是否被占用
- 启动日志保存在 `nohup.out` 文件中

### 3. 前端服务启动

```bash
cd frontend
sh prepare_env.sh # 构建运行环境
sh start.sh # 启动服务
sh stop.sh  # 停止服务
sh restart.sh # 重启服务器
```

- 前端服务默认运行在 3030 端口
- 使用 Next.js 框架构建
- 默认为生产模式
- 启动日志保存在 `./tmp/next.log` 文件中

## 企业用户使用该项目的方法

1. **部署项目**：
   - 在企业内部服务器上部署该平台（后端、agents 和前端服务）
   - 根据企业需求配置数据库和环境变量

2. **注册引流**：
   - 将自己的A2A智能体服务注册至[愚公社区](https://yugong.org/agent-space-share)
   - 借用社区的[统一对话前端](https://yugong.org/)为企业网站引流

## 普通用户（非开发者）使用该项目的方法

1. **使用已注册智能体**：
   - 无需关心和指定智能体，只需清晰描述需求即可调用最佳智能体获取想要的答案
   - 在[发现页](https://yugong.org/agent-space-discover)获取需要的智能体，定向开启对话
