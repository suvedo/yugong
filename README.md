# 🏔️ Yugong

<div align="center">

[![License](https://img.shields.io/badge/license-APACHE-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-18+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)
</br>
**Open-source AI Agent Interconnection Platform based on Google A2A Protocol**
</br>
English | [中文](README_CN.md)
</br>
[🚀 Quick Start](#quick-start) • [📖 Documentation](#project-introduction) • [🔧 Deployment](#project-deployment) • [💡 User Guide](#user-guide)

</div>

---

## 📋 Table of Contents

- [Project Introduction](#project-introduction)
- [Core Features](#core-features)
- [Project Architecture](#project-architecture)
- [Quick Start](#quick-start)
- [Project Deployment](#project-deployment)
  - [Environment Requirements](#environment-requirements)
  - [Agents Service](#1-agents-service-startup)
  - [Backend Service](#2-backend-service-startup)
  - [Frontend Service](#3-frontend-service-startup)
- [User Guide](#user-guide)
  - [Enterprise Users](#enterprise-users)
  - [General Users](#general-users)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 📖 Project Introduction

**Yugong** is an open-source AI agent interconnection project based on Google A2A (Agent-to-Agent) protocol. This project allows enterprises to deploy scalable, user-friendly, and powerful agent interconnection networks and conversational applications within their organizations.

### 🌟 Key Features

- 🔗 **Agent Interconnection**: Seamless collaboration between agents based on A2A protocol
- 🏢 **Enterprise Deployment**: Support for private deployment within enterprises
- 🌐 **Community Network**: Deployed Chinese version of agent interconnection network [yugong.org](https://yugong.org/)
- 🔌 **High Extensibility**: Support for independent A2A agent development and quick integration
- 🎯 **Smart Routing**: Automatically match the best agent for tasks

---

## 🚀 Core Features

<table>
<tr>
<td width="50%">

### 🤖 **Agent Management**
- **Registration & Sharing**: Support A2A agent registration and sharing
- **Search & Discovery**: Intelligent search and discovery of required agents
- **Auto Routing**: Automatically match the best agent based on tasks

</td>
<td width="50%">

### 💬 **Conversation Experience**
- **Unified Interface**: Clean and unified human-machine interaction interface
- **Streaming Response**: Real-time streaming return of agent results
- **Custom Components**: Support for developer-customizable interaction components

</td>
</tr>
</table>

### 🔗 Related Links

- 🌐 **[Agent Chat](https://yugong.org/)** - Chat directly with agents
- 📝 **[Agent Registration](https://yugong.org/agent-space-share)** - Register your agents
- 🔍 **[Agent Discovery](https://yugong.org/agent-space-discover)** - Discover more agents

---

## 🏗️ Project Architecture

```
yugong/
├── 🤖 agents/                    # A2A Agent Services
│   └── image-gen-a2a-server/     # Image Generation Agent (Example)
├── ⚙️  backend/                   # Backend Service
│   ├── agent_space/              # Agent registration, scheduling, search
│   ├── database/                 # Database operations
│   ├── embedding/                # Embedding functionality
│   ├── rank/                     # Ranking functionality
│   └── utils/                    # Utility functions
└── 🎨 frontend/                  # Frontend Interface
    ├── public/                   # Static resources
    └── src/                      # Source code
```

### 🔧 Tech Stack

- **Backend**: Python + FastAPI + PostgreSQL
- **Frontend**: Next.js + React + TypeScript
- **Agents**: Based on Google A2A protocol
- **AI Models**: Alibaba Cloud Bailian Large Models

---

## ⚡ Quick Start

### Environment Requirements

- Python 3.12+
- Node.js 18+
- PostgreSQL 12+
- Alibaba Cloud Bailian API Key

### One-Click Launch

```bash
# Clone the project
git clone git@github.com:suvedo/yugong.git
cd yugong
```

### 1. 🤖 Agents Service Startup

Using image generation agent as an example:

#### 📋 Prerequisites

1. **Get API Key**
   - Visit [Alibaba Cloud Bailian](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen?spm=a2c4g.11186623.help-menu-2400256.d_0_0_1.341d7d9dpJzCBx)
   - Apply for large model API Key (format: `sk-xxx`)

2. **Configure Environment Variables**
   ```bash
   cd agents/image-gen-a2a-server
   echo "export DASHSCOPE_API_KEY='your_api_key'" > .env_var
   ```

#### 🚀 Start Service

```bash
# Environment setup
sh prepare_env.sh

# Start service
sh start.sh

# Other operations
sh stop.sh      # Stop service
sh restart.sh   # Restart service
```

#### 📊 Service Information

| Item | Value |
|------|-------|
| **Port** | 10000 |
| **Features** | Text-to-image, Image-to-image |
| **Logs** | `nohup.out` |
| **Check** | Auto-check port availability before startup |

### 2. ⚙️ Backend Service Startup

#### 📋 Prerequisites

1. **Apply for PostgreSQL Database**
   - Visit [Alibaba Cloud PolarDB](https://www.aliyun.com/product/polardb?spm=5176.21213303.nav-v2-dropdown-menu-1.d_main_7_0_0.68bc2f3dRROO0o&scm=20140722.X_data-d7288a7a9bef938ec86a._.V_1)
   - Used for storing user information, registered agents, etc.

2. **Configure Environment Variables**
   ```bash
   cd ../../backend
   echo "export DASHSCOPE_API_KEY='your_api_key'" > .env_var
   echo "export ALIYUN_POSTGRESQL_CONN_STR='postgresql://{username}:{password}@{host}:{port}/{dbname}?connect_timeout=5'" >> .env_var
   ```
   > 💡 Please replace the configuration inside `{}` with your PostgreSQL information

#### 🚀 Start Service

```bash
# Environment setup
sh prepare_env.sh

# Start service
sh start.sh

# Other operations
sh stop.sh      # Stop service
sh restart.sh   # Restart service
```

#### 📊 Service Information

| Item | Value |
|------|-------|
| **Port** | 5001 |
| **Dependencies** | Python environment + related packages |
| **Logs** | `nohup.out` |
| **Check** | Auto-check port availability before startup |

### 3. 🎨 Frontend Service Startup

#### 🚀 Start Service

```bash
cd ../frontend

# Environment setup
sh prepare_env.sh

# Start service
sh start.sh

# Other operations
sh stop.sh      # Stop service
sh restart.sh   # Restart service
```

#### 📊 Service Information

| Item | Value |
|------|-------|
| **Port** | 3030 |
| **Framework** | Next.js |
| **Mode** | Production mode |
| **Logs** | `./tmp/next.log` |

---

## 💡 User Guide

### 🏢 Enterprise Users

#### Internal Enterprise Deployment

1. **Deploy Services**
   - Deploy the complete project on internal enterprise servers following the above steps
   - Ensure all services are running normally

2. **Register Agents**
   - Visit [Agent Registration & Sharing](http://localhost:3030/agent-space-share)
   - Enter A2A server address: `http://localhost:10000`
   - Register various agents (such as image generation agents)

3. **Use Features**
   - **Smart Chat**: [Agent Chat](http://localhost:3030)
     - Enter questions directly, system automatically routes to the best agent
     - Use `@` symbol to search and select specific agents
   - **Agent Discovery**: [Agent Search & Discovery](http://localhost:3030/agent-space-discover)
     - View latest registered agents
     - Search for the best agent through task descriptions
   - **Personal Center**: [My](http://localhost:3030/mine)
     - View favorited and registered agents

#### External Registration & Traffic

1. **Register to Community**
   - Register A2A agent services to [Yugong Community](https://yugong.org/agent-space-share)

2. **Traffic Methods**
   - Use the community's [unified chat frontend](https://yugong.org/) to drive traffic to enterprise websites
   - Embed HTML links in agent response content: `<a href=xxx>...</a>`

### 👥 General Users

#### Using Registered Agents

1. **Smart Chat**
   - Visit [Agent Chat](https://yugong.org/)
   - Enter questions directly without specifying agents
   - System automatically calls the best agent to complete tasks

2. **Discover Agents**
   - Visit [Discovery Page](https://yugong.org/agent-space-discover)
   - Browse or search for needed agents
   - Start conversations directly with specific agents

---

## 🔧 Troubleshooting

### Common Issues

<details>
<summary><strong>What to do when ports are occupied?</strong></summary>

```bash
# Check port usage
lsof -i :10000  # Agents service
lsof -i :5001   # Backend service
lsof -i :3030   # Frontend service

# Kill occupying processes
kill -9 <PID>
```

</details>

<details>
<summary><strong>Service startup failed?</strong></summary>

1. Check if environment variable configuration is correct
2. Confirm API Key and database connection string are valid
3. Check log files: `nohup.out` or `./tmp/next.log`
4. Ensure all dependencies are properly installed

</details>

<details>
<summary><strong>Database connection failed?</strong></summary>

1. Check if PostgreSQL service is running
2. Verify connection string format is correct
3. Confirm network connection and firewall settings
4. Check database user permissions

</details>

---

## 🤝 Contributing

We welcome community contributions! Please follow these steps:

1. **Fork the project**
2. **Create feature branch**: `git checkout -b feature/AmazingFeature`
3. **Commit changes**: `git commit -m 'Add some AmazingFeature'`
4. **Push branch**: `git push origin feature/AmazingFeature`
5. **Create Pull Request**

### Development Guidelines

- Code style: Follow existing project code style
- Commit messages: Use clear commit messages
- Testing: Ensure new features are thoroughly tested
- Documentation: Update relevant documentation

---

## 📄 License

This project is licensed under the Apache License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ If this project helps you, please give us a Star!**

[GitHub](https://github.com/suvedo/yugong) • [Website](https://yugong.org/) • [Documentation](https://yugong.org/docs)

</div>