# yugong (English Version)

<div align="center">
  <a href="README.md" style="padding: 8px 16px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Switch to Chinese Version</a>
</div>

---

## Project Introduction

yugong is an open source AI agent platform based on Google A2A (Agent-to-Agent) protocol. This platform allows users to register, discover and use various AI agents to implement intelligent task processing and service integration.

## Project Features

1. **Agent Registration and Discovery**: Support AI agent registration and semantic search discovery based on A2A protocol
2. **Multi-Agent Collaboration**: Enable collaboration between multiple AI agents
3. **Image Generation Agent**: Provide image generation function based on text description
4. **Web Interface**: Intuitive user interface for managing and using AI agents
5. **Scalability**: Easy to add new AI agents and features

## Project Structure

```
yugong/
├── agents/
│   └── image-gen-a2a-server/  # Image generation A2A server
├── backend/  # Backend services
│   ├── agent_space/  # Agent space related code
│   ├── database/  # Database operations
│   ├── embedding/  # Embedding functions
│   ├── rank/  # Ranking functions
│   └── utils/  # Utility functions
└── frontend/  # Frontend interface
    ├── public/  # Static resources
    └── src/  # Source code
```

## Service Startup Guide

### 1. Backend Service Startup

```bash
cd backend
./start.sh
```

- The backend service runs on port 5001 by default
- Depends on Python environment and related packages, you can prepare the environment with `prepare_env.sh` script
- Checks if the port is occupied before starting
- Startup logs are saved in the `nohup.out` file

### 2. Agents Service Startup

Take the image generation agent as an example:

```bash
cd agents/image-gen-a2a-server
./start.sh
```

- The image generation agent runs on port 10000 by default
- Supports text-to-image and image-to-image functions
- Checks if the port is occupied before starting
- Startup logs are saved in the `nohup.out` file

### 3. Frontend Service Startup

```bash
cd frontend
./start.sh
```

- The frontend service runs on port 3030 by default
- Built with Next.js framework
- Supports development and production modes
- Startup logs are saved in the `./tmp/next.log` file

## Usage for Enterprise Users

1. **Deploy the Project**:
   - Deploy backend, agents and frontend services on enterprise servers
   - Configure database and environment variables according to enterprise needs

2. **Integrate with Enterprise Systems**:
   - Use the provided API interfaces to integrate the yugong platform into existing enterprise systems
   - Customize agent registration and discovery mechanisms

3. **Manage Access Permissions**:
   - Configure user authentication and authorization mechanisms
   - Set up different levels of access permissions

4. **Develop Custom Agents**:
   - Develop custom AI agents according to enterprise business needs
   - Implement agent interfaces according to A2A protocol specifications

## Usage for Individual Users

1. **Local Deployment**:
   - Start all services according to the service startup guide
   - Access http://localhost:3030 to use the frontend interface

2. **Use Existing Agents**:
   - Browse and search for available AI agents in the frontend interface
   - Select suitable agents and submit tasks

3. **Register Custom Agents**:
   - Develop AI agents that comply with the A2A protocol
   - Register agents through API or frontend interface