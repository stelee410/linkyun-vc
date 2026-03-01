# Linkyun Agent API 使用指南

本文档面向**第三方客户端开发者**与 **Edge Proxy** 开发者，说明如何通过 HTTP API 与 Linkyun Agent 服务端交互。可用于开发 Web/移动端客户端、桌面客户端或本地 Edge 代理程序。

---

## 1. 概述

### 1.1 Base URL 与版本

- 所有 API 路径以 **`/api/v1`** 为前缀（除健康检查等根路径）。
- 示例：若服务部署在 `https://api.example.com`，则登录接口为 `POST https://api.example.com/api/v1/auth/login`。

### 1.2 认证方式概览

| 使用场景           | 认证方式        | Header / 说明 |
|--------------------|-----------------|----------------|
| 创作者/管理端 API  | Creator API Key | `X-API-Key`    |
| 工作空间上下文     | 可选            | `X-Workspace-Code` |
| Edge 代理连接与轮询 | Edge Token      | `X-Edge-Token` |
| 公开接口           | 无              | 注册、登录、健康检查、头像访问等 |

### 1.3 通用响应格式

- **成功**：HTTP 状态码 2xx，Body 为 JSON，结构为：
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
  业务有效载荷在 `data` 中（如登录的 `api_key`、`creator`、`user`、`workspace` 等均在 `data` 内）。

- **错误**：HTTP 状态码 4xx/5xx，Body 为：
  ```json
  {
    "success": false,
    "error": {
      "message": "错误描述信息"
    }
  }
  ```

文档中描述的「响应体」一般指业务数据（即上述 `data` 或等价结构），不再重复包一层 `success/data`。

---

## 2. 认证详解

### 2.1 Creator 认证（X-API-Key）

- 用于**创作者/管理端**所有需要登录态的接口。
- 在请求头中携带：
  ```http
  X-API-Key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- API Key 通过 **注册** 或 **登录** 接口获得；无效或过期会返回 `401`，Body 中 `error.message` 如：`Invalid or expired API key`。
- 可选头 `X-Username`：若携带，服务端会校验其与当前 API Key 对应用户名一致，否则 401。

### 2.2 工作空间上下文（X-Workspace-Code）

- 部分接口按「当前工作空间」过滤数据（如 Agent 列表、发现等）。
- 在请求头中携带工作空间唯一码：
  ```http
  X-Workspace-Code: default
  ```
- 不传时使用用户默认工作空间；传了则必须为当前用户已加入的工作空间，否则 403。

### 2.3 Edge 认证（X-Edge-Token）

- 仅用于 **Edge Proxy** 相关接口：`/api/v1/edge/*`、`/api/v1/edge/files/upload`、`/api/v1/edge/memories` 等。
- 在请求头中携带：
  ```http
  X-Edge-Token: et_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- Token 在创建或编辑 Agent 时选择类型为 **Edge** 时由服务端生成；也可通过「重置 Edge Token」接口重新生成。无效或缺失返回 401。

---

## 3. 公开接口（无需认证）

### 3.1 健康检查

- **GET** `/health`  
  - 检查服务与依赖（如数据库、Redis）是否可用。返回 `200` 且 Body 为 `OK` 表示正常。
- **GET** `/ready`  
  - 就绪检查。返回 `200` 且 Body 为 `Ready`。

### 3.2 认证：注册

- **POST** `/api/v1/auth/register`  
- **Request Body（JSON）**：
  ```json
  {
    "username": "用户名，3-100 字符",
    "email": "邮箱",
    "password": "密码，至少 8 位",
    "invitation_code": "邀请码，必填"
  }
  ```
- **Response**（201）：  
  `api_key`、`creator`、`account`、`user` 等，用于后续携带 `X-API-Key` 调用受保护接口。

### 3.3 认证：登录

- **POST** `/api/v1/auth/login`  
- **Request Body（JSON）**：
  ```json
  {
    "username": "用户名或邮箱",
    "password": "密码",
    "workspace_code": "可选，指定登录后当前工作空间"
  }
  ```
- **Response**（200）：  
  `api_key`、`creator`、`user`、`workspace`（若指定或存在默认）等。

### 3.4 头像访问（只读）

- **GET** `/api/v1/avatars/{filename}`  
- 无需认证。`filename` 为服务端返回的头像文件名（如 Agent 或 Creator 头像）。

---

## 4. Creator / 客户端 API（需 X-API-Key）

以下接口均需在请求头中携带 **`X-API-Key`**。如需按工作空间过滤，可同时携带 **`X-Workspace-Code`**。

### 4.1 个人资料（Profile）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/profile` | 获取当前创作者资料 |
| PUT  | `/api/v1/profile` | 更新资料，Body: `username`, `full_name`, `description`（均可选） |
| PUT  | `/api/v1/profile/password` | 修改密码，Body: `current_password`, `new_password` |
| POST | `/api/v1/profile/avatar` | 上传头像，multipart，字段 `avatar` |
| DELETE | `/api/v1/profile/avatar` | 删除头像 |

### 4.2 Agent 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/agents` | 创建 Agent。Body 见下 |
| GET  | `/api/v1/agents` | 列表（支持 query: `status`, `limit`, `offset`；受 X-Workspace-Code 影响） |
| GET  | `/api/v1/agents/discover` | 发现已发布 Agent（工作空间内，query: `limit`, `offset`） |
| GET  | `/api/v1/agents/by-code/{code}` | 按 code 获取单个 Agent |
| GET  | `/api/v1/agents/{id}` | 按 ID 获取 |
| PUT  | `/api/v1/agents/{id}` | 更新 |
| DELETE | `/api/v1/agents/{id}` | 软删除（归档） |
| POST | `/api/v1/agents/{id}/avatar` | 上传 Agent 头像（multipart，字段 `avatar`） |
| DELETE | `/api/v1/agents/{id}/avatar` | 删除 Agent 头像 |
| POST | `/api/v1/agents/{id}/publish` | 发布 Agent |
| POST | `/api/v1/agents/{id}/simulate` | 模拟对话（不建会话、不落库），Body 见下 |
| POST | `/api/v1/agents/{id}/edge-token/reset` | 重置 Edge Token（仅 `agent_type=edge`） |
| GET  | `/api/v1/agents/{id}/test-user` | 获取当前创作者对应的测试用户 ID |

**创建 Agent（POST /api/v1/agents）Request Body 示例**：
```json
{
  "code": "my-agent",
  "name": "显示名",
  "description": "描述",
  "model": "model-id",
  "system_prompt": "系统提示词",
  "temperature": 0.7,
  "agent_type": "cloud",
  "memory_enabled": false,
  "examples": [],
  "skills": [],
  "rag_config": null,
  "workspace_id": null,
  "llm_provider": "",
  "llm_temperature": null
}
```
- `code`：2–64 字符，小写字母、数字、下划线、连字符，全局唯一。  
- `agent_type`：`cloud`（默认）或 `edge`。  
- 可选 `workspace_id` 或通过头 `X-Workspace-Code` 指定工作空间。

**模拟对话（POST /api/v1/agents/{id}/simulate）Request Body 示例**：
```json
{
  "content": "用户输入文本",
  "attachments": [
    { "type": "image", "token": "文件上传后返回的 token", "mime_type": "image/jpeg", "name": "x.jpg", "size": 12345 }
  ],
  "messages": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ],
  "system_prompt": "可选覆盖",
  "examples": [],
  "skills": [],
  "mid_skills": [],
  "post_skills": []
}
```
- `content` 或 `attachments` 至少其一；附件可用 `token`（推荐，先调文件上传）或 `data`（base64）。

### 4.3 工作空间（Workspace）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/workspaces` | 当前用户工作空间列表 |
| POST | `/api/v1/workspaces` | 创建，Body: `name`, `code` |
| GET  | `/api/v1/workspaces/{id}` | 详情 |
| PUT  | `/api/v1/workspaces/{id}` | 更新，Body: `name`, `status`（仅 owner） |
| DELETE | `/api/v1/workspaces/{id}` | 删除（仅 owner） |
| GET  | `/api/v1/workspaces/{id}/members` | 成员列表 |
| POST | `/api/v1/workspaces/{id}/members` | 添加成员，Body: `username`, `role`（admin/member） |
| DELETE | `/api/v1/workspaces/{id}/members/{userId}` | 移除成员 |
| PUT  | `/api/v1/workspaces/{id}/members/{userId}` | 更新成员角色，Body: `role`（owner/admin/member） |
| GET  | `/api/v1/workspaces/{id}/audit-logs` | 审计日志（仅 owner），query: `offset`, `limit` |
| GET  | `/api/v1/user/workspaces` | 当前用户的工作空间及角色 |
| POST | `/api/v1/user/workspace/switch` | 切换当前工作空间，Body: `workspace_code` |
| POST | `/api/v1/user/workspace/leave` | 离开工作空间，Body 或 Header: `workspace_code`（不能离开 default） |
| POST | `/api/v1/user/workspace/join` | 通过邀请码加入，Body: `invite_code` |
| GET  | `/api/v1/user/workspace/invite-code` | 获取当前工作空间邀请码（需 X-Workspace-Code） |
| POST | `/api/v1/user/workspace/invite-code/refresh` | 刷新邀请码（需 X-Workspace-Code） |

### 4.4 会话与消息（Session / Message）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/sessions` | 创建会话，Body: `agent_id`, `user_id`, `custom_prompt_patch`, `metadata` |
| GET  | `/api/v1/sessions` | 会话列表（query 等） |
| GET  | `/api/v1/sessions/{id}` | 会话详情 |
| PUT  | `/api/v1/sessions/{id}` | 更新会话 |
| PATCH | `/api/v1/sessions/{id}/prompt` | 更新会话自定义 prompt |
| GET  | `/api/v1/sessions/{id}/messages` | 会话消息列表 |
| POST | `/api/v1/sessions/{id}/end` | 结束会话 |
| PATCH | `/api/v1/sessions/{id}/verify` | 验证会话 |
| POST | `/api/v1/sessions/{session_id}/messages` | 发送消息，Body: `content`, `attachments`, `metadata`, `options`, `stream` |
| GET  | `/api/v1/messages` | 消息列表（query） |
| GET  | `/api/v1/messages/{id}` | 单条消息 |

与 Agent 共享用户/会话相关：
- GET `/api/v1/agents/{id}/shared-users`  
- GET `/api/v1/agents/{agent_id}/users/{user_id}/shared-sessions`  
- GET/PUT `/api/v1/agents/{agent_id}/users/{user_id}/prompt`

### 4.5 用户聊天（User Hub 1v1）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/user/chats` | 创建单聊 |
| GET  | `/api/v1/user/chats` | 单聊列表 |
| GET  | `/api/v1/user/chats/{id}` | 单聊详情 |
| PATCH | `/api/v1/user/chats/{id}` | 更新 |
| DELETE | `/api/v1/user/chats/{id}` | 删除 |
| POST | `/api/v1/user/chats/{id}/messages` | 发消息 |
| GET  | `/api/v1/user/chats/{id}/messages` | 消息列表 |
| DELETE | `/api/v1/user/chats/{id}/messages` | 清空消息 |
| DELETE | `/api/v1/user/chats/{id}/memories` | 删除该会话记忆 |
| PATCH | `/api/v1/user/chats/{id}/share` | 切换分享状态 |

### 4.6 群聊（User Hub Group）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/user/group-chats` | 创建群聊，Body: `agent_ids: number[]`, `topic`, `title`（至少 1 个 Agent ID） |
| GET  | `/api/v1/user/group-chats` | 群聊列表 |
| GET  | `/api/v1/user/group-chats/{id}` | 群聊详情 |
| PATCH | `/api/v1/user/group-chats/{id}` | 更新 |
| DELETE | `/api/v1/user/group-chats/{id}` | 删除 |
| POST | `/api/v1/user/group-chats/{id}/messages` | 发消息 |
| GET  | `/api/v1/user/group-chats/{id}/messages` | 消息列表 |
| PATCH | `/api/v1/user/group-chats/{id}/participants` | 更新参与者 |
| PATCH | `/api/v1/user/group-chats/{id}/share` | 切换分享 |

### 4.7 好友（Friends）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/friends` | 添加好友（Body 含 agent_id 等） |
| GET  | `/api/v1/friends` | 好友列表 |
| DELETE | `/api/v1/friends/{agent_id}` | 移除好友 |

### 4.8 技能与知识库

- **技能**  
  - GET `/api/v1/skills`：内置技能列表。  
  - GET `/api/v1/llm-providers`：LLM 提供商列表。  
- **创作者技能 / 市场**  
  - GET `/api/v1/skills/marketplace`、GET `/api/v1/skills/marketplace/{id}`  
  - GET/POST `/api/v1/creator-skills`，GET/PUT/DELETE `/api/v1/creator-skills/{id}`  
  - GET/PUT `/api/v1/agents/{id}/post-skills`、`mid-skills`、`pre-skills`  
  - POST `/api/v1/agents/{id}/pre-skills/add-builtin-image-upload`、`add-builtin-document-upload`  
  - GET `/api/v1/agents/{id}/skills/widgets`  
- **知识库**  
  - GET/POST `/api/v1/knowledge-bases`，GET/PUT/DELETE `/api/v1/knowledge-bases/{id}`  
  - GET `/api/v1/knowledge-bases/{id}/documents`  
  - POST `/api/v1/knowledge-bases/{id}/documents/upload`、`/documents/url`、`/documents/text`  
- **文档**  
  - GET/DELETE `/api/v1/documents/{id}`  
  - POST `/api/v1/documents/{id}/reindex`  
  - GET `/api/v1/documents/{id}/chunks`  

### 4.9 记忆（Memory）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/users/{user_id}/agents/{agent_id}/memories` | 列表 |
| POST | `/api/v1/users/{user_id}/agents/{agent_id}/memories` | 创建 |
| DELETE | `/api/v1/users/{user_id}/agents/{agent_id}/memories` | 清空 |
| DELETE | `/api/v1/memories/{id}` | 删除单条 |
| GET  | `/api/v1/users/{user_id}/agents/{agent_id}/memory-preferences` | 记忆偏好 |
| PATCH | `/api/v1/users/{user_id}/agents/{agent_id}/memory-preferences` | 更新偏好 |

### 4.10 文件上传（Creator）

- **POST** `/api/v1/files/upload`  
  - multipart，字段 `file`，图片类；返回临时文件 token，发消息时在 `attachments[].token` 中引用。  
- **POST** `/api/v1/files/upload-document`  
  - 文档上传（如 PDF、Word、TXT）。  
- **POST** `/api/v1/files/upload-moment-image`  
  - 动态图片上传（会裁剪等）。  
- **GET** `/api/v1/files/{token}/download`  
  - 通过 token 下载临时文件。  
- **GET** `/api/v1/files/permanent/{token}/download`  
  - 永久文件下载。  

### 4.11 动态（Moment）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/agents/{id}/moments/draft` | 生成草稿 |
| POST | `/api/v1/agents/{id}/moments` | 发布动态 |
| GET  | `/api/v1/agents/{id}/moments` | Agent 动态列表 |
| DELETE | `/api/v1/agents/{id}/moments/{momentId}` | 删除 |
| GET  | `/api/v1/moments` | 动态列表 |
| POST | `/api/v1/moments/{momentId}/like` | 点赞 |
| DELETE | `/api/v1/moments/{momentId}/like` | 取消点赞 |
| POST | `/api/v1/moments/{momentId}/comments` | 评论 |
| POST/GET/DELETE | `/api/v1/agents/{id}/moments/auto-schedule` | 自动排期 |

---

## 5. Edge Proxy API（需 X-Edge-Token）

Edge 代理程序使用 **`X-Edge-Token`** 鉴权，与 Creator 的 `X-API-Key` 互斥。用于将「用户对话」从云端转发到本地 Edge，再由 Edge 调用本地 LLM/知识库/MCP 后回写结果。

### 5.1 连接与心跳

- **POST** `/api/v1/edge/connect`  
  - Body: `{ "agent_uuid": "<agent_uuid>" }`，需与 token 对应 Agent 的 UUID 一致。  
  - 成功：标记该 Agent 在线，并返回 `queue_config`（含 `poll_url`、`respond_url`、`heartbeat_url`、`poll_timeout_seconds`、`heartbeat_interval_seconds` 等），供 Edge 配置长轮询与心跳。  

- **POST** `/api/v1/edge/heartbeat`  
  - Body: `{ "agent_uuid": "<agent_uuid>" }`。  
  - 刷新在线状态与最后心跳时间。建议按 `queue_config.heartbeat_interval_seconds`（如 15 秒）周期调用。  

- **POST** `/api/v1/edge/disconnect`  
  - Body 可含 `agent_uuid`。  
  - 标记 Agent 离线。  

### 5.2 长轮询与响应

- **GET** `/api/v1/edge/poll?agent_uuid=<agent_uuid>&timeout=30`  
  - 长轮询获取待处理请求。`timeout` 为秒，建议 30，最大约 60。  
  - 有请求时返回 **EdgeRequest** 结构；超时无请求时返回 `null` 或空数据。  

**EdgeRequest 结构示例**：
```json
{
  "request_id": "uuid",
  "agent_uuid": "agent-uuid",
  "session_uuid": "session-uuid",
  "type": "chat",
  "system_prompt": "...",
  "messages": [ { "role": "user", "content": "..." } ],
  "attachments": null,
  "model": "...",
  "temperature": 0.7,
  "max_tokens": 4096,
  "memory_enabled": false,
  "llm_provider": "",
  "creator_id": "...",
  "user_id": "...",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

- **POST** `/api/v1/edge/respond`  
  - 回写 Edge 处理结果。Body 为 **EdgeResponse**：  

```json
{
  "request_id": "对应请求的 request_id",
  "agent_uuid": "agent-uuid",
  "success": true,
  "content": "助手回复文本",
  "model": "可选",
  "usage": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 },
  "metadata": {},
  "audio_base64": "",
  "audio_format": "mp3",
  "audio_url": "",
  "error": "",
  "timestamp": "ISO8601"
}
```
- 失败时 `success: false`，可填 `error`。服务端会把该响应与请求关联并返回给用户。

### 5.3 Edge 端文件上传

- **POST** `/api/v1/edge/files/upload`  
  - Header: `X-Edge-Token`。  
  - multipart，字段 `file`。  
  - 返回临时文件 token，可在 Edge 处理消息时用于读取用户上传的文件（与 Creator 上传的 token 机制一致，供消息体引用）。  

### 5.4 Edge 记忆（Edge Memory）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/edge/memories?agent_uuid=xxx&user_id=xxx` | 按用户列记忆 |
| POST | `/api/v1/edge/memories` | 创建记忆，Body: `user_id`, `content`, `category`, `source` |
| POST | `/api/v1/edge/memories/delete-by-keyword` | 按关键词删除 |

---

## 6. 其他说明

### 6.1 CORS

- 服务端通过配置或环境变量设置允许的 Origin（如 `CORS_ALLOWED_ORIGINS`）。  
- 允许的请求头通常包含：`Content-Type`, `X-API-Key`, `X-Username`, `X-Workspace-Code`。  
- 若需在浏览器中携带 `X-Edge-Token`，需在服务端 CORS 配置中允许该头。  

### 6.2 分页与列表

- 列表类接口常用 query：`limit`（默认可用 50）、`offset`（默认 0）。  
- 响应中常有 `total` 或列表长度，便于前端分页。  

### 6.3 监控

- **GET** `/metrics`  
  - 返回 worker、缓存等简单指标（JSON 或文本），可用于监控，无需认证（部署时可按需限制访问）。  

### 6.4 错误码与重试

- `400`：参数错误或业务校验失败，请根据 `error.message` 调整请求。  
- `401`：未提供或无效的 API Key / Edge Token。  
- `403`：无权限（如非工作空间成员、非 Agent 所属者等）。  
- `404`：资源不存在。  
- `409`：冲突（如 code 重复、邀请码用尽等）。  
- `413`：请求体过大（如文件超限）。  
- `5xx`：服务端错误，可有限重试（建议带退避）。  

---

## 7. 快速索引：按角色使用

- **仅做第三方 Web/移动端客户端**：  
  使用「公开接口」登录/注册获取 `api_key`，之后全部请求带 `X-API-Key`，按需带 `X-Workspace-Code`，调用 **第 4 节** 的 Creator/会话/消息/用户聊天/群聊/文件等接口即可。  

- **仅做 Edge Proxy**：  
  使用 Agent 的 `edge_token`，在请求头带 `X-Edge-Token`，按 **第 5 节** 实现：连接 → 周期性心跳 → 长轮询 `/edge/poll` → 本地处理 → `/edge/respond`；如需上传文件或读写记忆，使用 Edge 文件与 Edge Memory 接口。  

- **同时开发客户端与 Edge**：  
  客户端用 X-API-Key 调用 Creator API；Edge 进程用 X-Edge-Token 调用 Edge API，两套认证互不混用。  

---

*文档版本与代码一致，若接口有变更请以实际服务为准。*
