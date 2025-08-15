# yugong

<div align="center">
  <a href="README_CN.md" style="padding: 8px 16px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">切换至中文</a>
</div>

---

## Project Introduction

Yugong is an open-source AI agent interconnection project based on Google's A2A (Agent-to-Agent) protocol. It allows enterprises to deploy scalable, easy-to-use, and powerful agent networks and conversational applications within their organizations. The community has also deployed a (Chinese version) agent interconnection network ([click to jump](https://yugong.org/)), where enterprises can register their A2A agent services. Individual users can then easily utilize enterprise agents within the network's scheduling system.

## Project Features

1. **[Agent Registration and Sharing](https://yugong.org/agent-space-share)**: Support AI agent registration based on A2A protocol, driving traffic to enterprise agent websites
2. **[Simple and Direct Agent Conversation](https://yugong.org/)**: No need to care about or specify agents; the system will automatically match and call the best agent to complete tasks based on user needs
3. **[Agent Search and Discovery](https://yugong.org/agent-space-discover)**: Users can search or discover needed agents and initiate conversations with them
4. **Unified and Concise Human-Computer Interaction Interface**: Integrating common agent interaction interfaces on the market, providing a unified user interaction, and offering flexible developer-customizable interaction components in agent responses (including page jumping)
5. **Highly Scalable/Low Coupling Agent Ecosystem**: A2A agents can be independently developed and connected to the network through registration, enriching capabilities of the network and achieving a highly scalable/low coupling agent ecosystem

## Project Structure

```
yugong/
├── agents/ # Various A2A agents
│   └── image-gen-a2a-server/  # Image generation A2A agent (example)
├── backend/  # Backend services
│   ├── agent_space/  # Agent registration, scheduling, search code
│   ├── database/  # Database operations
│   ├── embedding/  # Embedding functions
│   ├── rank/  # Ranking functions
│   └── utils/  # Utility functions
└── frontend/  # Frontend interface
    ├── public/  # Static resources
    └── src/  # Source code
```

## Project Deployment Steps
### 0. Clone the Project
```bash
git clone git@github.com:suvedo/yugong.git
cd yugong
```
### 1. Agents Service Startup

Take the image generation agent as an example:

```bash
cd agents/image-gen-a2a-server
sh prepare_env.sh # Set up runtime environment
sh start.sh # Start service
sh stop.sh  # Stop service
sh restart.sh # Restart service
```

- The image generation agent runs on port 10000 by default
- Supports text-to-image and image-to-image functions
- Checks if the port is occupied before starting
- Startup logs are saved in the `nohup.out` file

### 2. Backend Service Startup

```bash
cd backend
sh prepare_env.sh # Set up runtime environment
sh start.sh # Start service
sh stop.sh  # Stop service
sh restart.sh # Restart service
```

- The backend service runs on port 5001 by default
- Depends on Python environment and related packages, set up via `prepare_env.sh` script
- Checks if the port is occupied before starting
- Startup logs are saved in the `nohup.out` file

### 3. Frontend Service Startup

```bash
cd frontend
sh prepare_env.sh # Set up runtime environment
sh start.sh # Start service
sh stop.sh  # Stop service
sh restart.sh # Restart service
```

- The frontend service runs on port 3030 by default
- Built with Next.js framework
- Defaults to production mode
- Startup logs are saved in the `./tmp/next.log` file

## Usage for Enterprise Users

1. **Deploy the Project**:
   - Deploy the project (backend, agents, and frontend services) on enterprise internal servers
   - Configure database and environment variables according to enterprise needs

2. **Registration and Traffic Generation**:
   - Register your A2A agent services on [yugong Community](https://yugong.org/agent-space-share)
   - Use the community's [unified conversation frontend](https://yugong.org/) to drive traffic to enterprise websites

## Usage for Regular Users (Non-Developers)

1. **Use Registered Agents**:
   - No need to care about or specify agents; just clearly describe your needs to call the best agent to get the answers you want
   - Obtain needed agents on the [discovery page](https://yugong.org/agent-space-discover) and initiate directed conversations