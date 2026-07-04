# 微信小程序保险代理人助手 - 架构设计

## 项目概述

为平安人寿保险代理人团队（30+ 用户）搭建微信小程序，提供基于 Claude AI 的展业辅助能力，包括产品咨询、权益解读、客户异议处理、新人培训等场景的智能问答。

## 技术栈

### 前端
- 微信原生小程序（WXML + WXSS + JavaScript）
- 微信手机号一键登录

### 后端
- Node.js 18+ + Express
- PM2（进程管理）
- nginx（反向代理 + SSL）

### AI 服务
- skyapi.org 中转 API
- 模型：claude-haiku-4-5（用户问答）
- API Key：sk-IYLvMglPbyVZ2848anldHhp69xj6eR7veumkGLtC4fKrCUOC
- Base URL：https://api.skyapi.org

### 数据存储
- MySQL 8.0（用户信息、白名单、对话历史）
- 文件系统（知识库 md 文件、用户记忆文件）

### 部署环境
- 阿里云轻量应用服务器
- 域名 + SSL 证书（需备案）

## 系统架构

```
┌─────────────────┐
│  微信小程序前端  │
│  - 对话界面      │
│  - 用户中心      │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────────────────────────┐
│      阿里云后端 API (Express)        │
│  ┌─────────────────────────────────┐│
│  │  /api/auth/login                ││  ← 手机号+邀请码验证
│  │  /api/chat/send                 ││  ← 发送消息
│  │  /api/chat/history              ││  ← 获取历史对话
│  │  /api/user/profile              ││  ← 用户信息
│  └─────────────────────────────────┘│
│                                      │
│  ┌──────────┐  ┌──────────────────┐│
│  │  MySQL   │  │  文件系统         ││
│  │  - users │  │  - 知识库 md     ││
│  │  - chats │  │  - 用户记忆 md   ││
│  └──────────┘  └──────────────────┘│
└────────┬────────────────────────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│  skyapi.org     │
│  claude-haiku   │
└─────────────────┘
```

## 核心功能模块

### 1. 用户鉴权模块
- 微信手机号一键登录（获取 openid + 手机号）
- 邀请码验证（后端维护邀请码-手机号白名单映射表）
- JWT token 签发（有效期 7 天）

### 2. 对话模块（核心）
- 多轮对话上下文管理（按 openid 隔离）
- 知识库注入（v1 全量注入 system prompt + prompt caching）
- 用户记忆注入（读取 `/data/memories/{openid}.md`）
- 流式返回（SSE）

### 3. 知识库管理
- 本地知识库路径：`D:\寿险上分\0.知识库\`
- 包含：产品知识、权益体系、新人养成（5个主题）、案例库
- v1：手动同步到阿里云服务器 `/data/knowledge/`
- v2 预留：自动化同步脚本

### 4. 用户记忆系统
- 每个用户独立记忆文件：`/data/memories/{openid}.md`
- 存储：用户画像、历史关键信息、偏好
- v1：仅读取注入 prompt
- v2 预留：AI 自动更新记忆文件

### 5. 用户中心
- 显示：头像、姓名、手机号、注册时间
- v2 预留：使用统计（对话次数、活跃度）

## 数据库设计

### users 表
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(50),
  avatar_url VARCHAR(255),
  invite_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_invite_code (invite_code)
);
```

### invite_codes 表（白名单）
```sql
CREATE TABLE invite_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_phone (phone)
);
```

### chats 表（对话历史）
```sql
CREATE TABLE chats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_openid_time (openid, created_at)
);
```

## Prompt 设计

### System Prompt 结构
```
你是平安人寿保险代理人的专属助手，基于以下知识库回答问题：

【知识库内容】
{知识库 md 文件全量内容}

【用户记忆】
{用户记忆文件内容}

【回答要求】
1. 用自己的话转述知识库内容，不得逐字引用原文（版权保护）
2. 回答简洁专业，口语化表达
3. 涉及郑荣禄博士课程内容时，转化为通用方法论表达
4. 如果知识库中没有相关信息，诚实告知"这个问题超出我的知识范围"
5. 保持温暖鼓励的语气，理解代理人的压力和困惑
```

## 版权保护措施
1. Prompt 明确要求转述，禁止逐字引用
2. 小程序前端对话内容设置 `selectable="false"`（禁止长按复制）
3. 对话界面添加水印"仅供内部学习使用"
4. 白名单机制限制访问范围

## v1 MVP 范围

| 功能 | 实现 |
|------|------|
| 手机号+邀请码登录 | ✅ |
| 自由对话（多轮上下文） | ✅ |
| 知识库全量注入 + prompt caching | ✅ |
| 用户记忆读取 | ✅ |
| 用户中心（基本信息） | ✅ |
| 对话历史查询 | ✅ |

## v2 迭代预留

| 功能 | 说明 |
|------|------|
| RAG 向量检索 | 降低 token 成本，提升检索精度 |
| 记忆自动更新 | AI 自动分析对话，更新用户记忆文件 |
| 知识库自动同步 | 本地 → 阿里云自动化脚本 |
| 使用统计 | 对话次数、活跃度、高频问题分析 |
| 管理后台 | 白名单管理、用户管理、知识库更新 |

## 安全考虑
1. API Key 存储在环境变量，不提交代码仓库
2. JWT token 签名密钥使用强随机字符串
3. 所有 API 接口验证 JWT token
4. 白名单机制防止非授权访问
5. 对话历史仅用户本人可见（按 openid 隔离）
6. nginx 配置 rate limiting 防止滥用

## 部署流程
1. 阿里云服务器安装 Node.js 18+、MySQL 8.0、nginx、PM2
2. 创建数据库和表结构
3. 上传知识库 md 文件到 `/data/knowledge/`
4. 配置环境变量（API Key、数据库连接、JWT 密钥）
5. PM2 启动后端服务
6. nginx 配置反向代理 + SSL
7. 微信小程序后台配置服务器域名
8. 提交小程序审核

## 成本估算（月）
- 阿里云服务器：¥50-100（轻量应用服务器 2核4G）
- skyapi.org API 调用：
  - 假设 30 用户，每人每天 10 次对话，每次 2k tokens 输入 + 500 tokens 输出
  - 月总量：30 × 10 × 30 × (2k + 0.5k) = 2.25M tokens
  - claude-haiku-4-5：输入 $0.20/M × 2M + 输出 $1.00/M × 0.25M = $0.65 ≈ ¥5
- 总计：¥55-105/月

## 开发周期估算
- 后端 API 开发：2-3 天
- 小程序前端开发：2-3 天
- 联调测试：1 天
- 部署上线：1 天
- 总计：6-8 天
