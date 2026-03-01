#!/bin/bash

# =============================================================================
# Linkyun 环境配置脚本
# 生成 .env.local 和 docker-compose.yml
# =============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Linkyun 环境配置${NC}"
echo ""

# 读取用户输入
echo -ne "${GREEN}API Base URL${NC} [${YELLOW}https://linkyun.co${NC}]: "
read input; API_BASE_URL="${input:-https://linkyun.co}"

echo -ne "${GREEN}Workspace Code${NC} [${YELLOW}legalwise${NC}]: "
read input; WORKSPACE_CODE="${input:-legalwise}"

echo -ne "${GREEN}Workspace Join Code${NC} [${YELLOW}ox99234${NC}]: "
read input; WORKSPACE_JOIN_CODE="${input:-ox99234}"

echo -ne "${GREEN}System Service Agent Code${NC} [${YELLOW}legalwise-system${NC}]: "
read input; SYSTEM_SERVICE_AGENT_CODE="${input:-legalwise-system}"

echo -ne "${GREEN}System Agent Code${NC} [${YELLOW}legalwise${NC}]: "
read input; SYSTEM_AGENT_CODE="${input:-legalwise}"

echo -ne "${GREEN}System Assistant Agent Code${NC} [${YELLOW}legalwise-assistant${NC}]: "
read input; SYSTEM_ASSISTANT_AGENT_CODE="${input:-legalwise-assistant}"

echo -ne "${GREEN}Site Theme (legalwise/vc)${NC} [${YELLOW}legalwise${NC}]: "
read input; SITE_THEME="${input:-legalwise}"

echo -ne "${GREEN}Register Invitation Code${NC} [${YELLOW}legalwise${NC}]: "
read input; REGISTER_INVITATION_CODE="${input:-legalwise}"

echo -ne "${GREEN}Site Title${NC} [${YELLOW}法制通法律AI智能平台${NC}]: "
read input; SITE_TITLE="${input:-法制通法律AI智能平台}"

echo -ne "${GREEN}Container Name${NC} [${YELLOW}${WORKSPACE_CODE}-frontend${NC}]: "
read input; CONTAINER_NAME="${input:-${WORKSPACE_CODE}-frontend}"

echo -ne "${GREEN}Host Port${NC} [${YELLOW}80${NC}]: "
read input; HOST_PORT="${input:-80}"

# 生成 .env.local 文件
cat > .env.local << EOF
# Linkyun 环境配置
VITE_API_BASE_URL="$API_BASE_URL"
VITE_WORKSPACE_CODE="$WORKSPACE_CODE"
VITE_WORKSPACE_JOIN_CODE="$WORKSPACE_JOIN_CODE"
VITE_SYSTEM_SERVICE_AGENT_CODE="$SYSTEM_SERVICE_AGENT_CODE"
VITE_SYSTEM_AGENT_CODE="$SYSTEM_AGENT_CODE"
VITE_SYSTEM_ASSISTANT_AGENT_CODE="$SYSTEM_ASSISTANT_AGENT_CODE"
VITE_SITE_THEME="$SITE_THEME"
VITE_REGISTER_INVITATION_CODE="$REGISTER_INVITATION_CODE"
VITE_TITLE="$SITE_TITLE"
EOF

# 生成 docker-compose.yml 文件
cat > docker-compose.yml << EOF
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_API_BASE_URL=$API_BASE_URL
        - VITE_WORKSPACE_CODE=$WORKSPACE_CODE
        - VITE_WORKSPACE_JOIN_CODE=$WORKSPACE_JOIN_CODE
        - VITE_SYSTEM_SERVICE_AGENT_CODE=$SYSTEM_SERVICE_AGENT_CODE
        - VITE_SYSTEM_AGENT_CODE=$SYSTEM_AGENT_CODE
        - VITE_SYSTEM_ASSISTANT_AGENT_CODE=$SYSTEM_ASSISTANT_AGENT_CODE
        - VITE_SITE_THEME=$SITE_THEME
        - VITE_REGISTER_INVITATION_CODE=$REGISTER_INVITATION_CODE
        - VITE_TITLE=$SITE_TITLE
    container_name: $CONTAINER_NAME
    ports:
      - "$HOST_PORT:80"
    restart: unless-stopped
EOF

echo ""
echo -e "${GREEN}已生成配置文件:${NC}"
echo -e "  - ${CYAN}.env.local${NC}"
echo -e "  - ${CYAN}docker-compose.yml${NC}"
echo ""
echo -e "本地开发: ${CYAN}npm install && npm run dev${NC}"
echo -e "Docker 部署: ${CYAN}docker-compose up -d --build${NC}"
