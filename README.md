# Linkyun VC / LegalWise

基于 Linkyun 平台的 AI 智能服务前端，支持多主题切换。

## 主题

- **legalwise** - 律小乖（法律咨询服务）
- **vc** - 凌云资本（VC 投资服务）

## 快速开始

### 方式一：使用配置向导（推荐）

```bash
# Linux / macOS
chmod +x setup.sh
./setup.sh

# 安装依赖并启动
npm install
npm run dev
```

### 方式二：手动配置

1. 复制环境配置文件：
   ```bash
   cp .env.local.example .env.local
   ```

2. 编辑 `.env.local` 配置环境变量

3. 安装依赖并启动：
   ```bash
   npm install
   npm run dev
   ```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_BASE_URL` | API 基地址 | `https://linkyun.co` |
| `VITE_WORKSPACE_CODE` | 工作空间代码 | `legalwise` |
| `VITE_WORKSPACE_JOIN_CODE` | 加入邀请码 | `ox99234` |
| `VITE_SYSTEM_AGENT_CODE` | 系统主 Agent | `legalwise` |
| `VITE_SYSTEM_ASSISTANT_AGENT_CODE` | 系统助手 Agent | `legalwise-assistant` |
| `VITE_SYSTEM_SERVICE_AGENT_CODE` | 系统服务 Agent | `legalwise-system` |
| `VITE_SITE_THEME` | 主题 (`legalwise` \| `vc`) | `legalwise` |
| `VITE_REGISTER_INVITATION_CODE` | 注册邀请码 | `legalwise` |

## 服务端初始化

```bash
# 添加注册邀请码
linkyun-admin-cli inv-add <邀请码> <可用次数>

# 创建工作空间
linkyun-admin-cli ws-create <名称> <代码> <创建者用户名>

# 设置工作空间加入邀请码
linkyun-admin-cli ws-set-invite-code <工作空间代码> <邀请码>
```

然后前往创作者界面创建相应的 Agent：`https://linkyun.co/creator`
