# yugong

<div align="center">
  <a href="README_EN.md" style="padding: 8px 16px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">切换到英文版本</a>
</div>

---

## 项目简介

yugong 是一个基于 Google A2A (Agent-to-Agent) 协议的开源 AI 代理平台。该平台允许用户注册、发现和使用各种 AI 代理，实现智能化任务处理和服务集成。

## 项目功能介绍

1. **代理注册与发现**：支持基于 A2A 协议的 AI 代理注册和语义搜索发现
2. **多代理协作**：实现多个 AI 代理之间的协同工作
3. **图片生成代理**：提供基于文本描述的图片生成功能
4. **Web 界面**：直观的用户界面，方便管理和使用 AI 代理
5. **可扩展性**：易于添加新的 AI 代理和功能

## 项目结构介绍

```
yugong/
├── agents/
│   └── image-gen-a2a-server/  # 图片生成 A2A 服务器
├── backend/  # 后端服务
│   ├── agent_space/  # 代理空间相关代码
│   ├── database/  # 数据库操作
│   ├── embedding/  # 嵌入功能
│   ├── rank/  # 排序功能
│   └── utils/  # 工具函数
└── frontend/  # 前端界面
    ├── public/  # 静态资源
    └── src/  # 源代码
```

## 服务启动方案

### 1. 后端服务启动

```bash
cd backend
./start.sh
```

- 后端服务默认运行在 5001 端口
- 依赖 Python 环境和相关包，可以通过 `prepare_env.sh` 脚本准备环境
- 启动前会检查端口是否被占用
- 启动日志保存在 `nohup.out` 文件中

### 2. Agents 服务启动

以图片生成代理为例：

```bash
cd agents/image-gen-a2a-server
./start.sh
```

- 图片生成代理默认运行在 10000 端口
- 支持文生图和图生图功能
- 启动前会检查端口是否被占用
- 启动日志保存在 `nohup.out` 文件中

### 3. 前端服务启动

```bash
cd frontend
./start.sh
```

- 前端服务默认运行在 3030 端口
- 使用 Next.js 框架构建
- 支持开发模式和生产模式
- 启动日志保存在 `./tmp/next.log` 文件中

## 企业用户使用该项目的方法

1. **部署项目**：
   - 在企业服务器上部署后端、agents 和前端服务
   - 根据企业需求配置数据库和环境变量

2. **集成企业系统**：
   - 使用提供的 API 接口将 yugong 平台集成到企业现有系统中
   - 自定义代理注册和发现机制

3. **管理访问权限**：
   - 配置用户认证和授权机制
   - 设置不同层级的访问权限

4. **开发自定义代理**：
   - 根据企业业务需求开发自定义 AI 代理
   - 按照 A2A 协议规范实现代理接口

## 个人用户使用该项目的方法

1. **本地部署**：
   - 按照服务启动方案启动所有服务
   - 访问 http://localhost:3030 使用前端界面

2. **使用现有代理**：
   - 在前端界面浏览和搜索可用的 AI 代理
   - 选择合适的代理并提交任务

3. **注册自定义代理**：
   - 开发符合 A2A 协议的 AI 代理
   - 通过 API 或前端界面注册代理
