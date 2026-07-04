# 微信小程序保险代理人助手 - 开发指令

## 项目概述

本项目为平安人寿保险代理人团队搭建微信小程序，提供基于 Claude AI 的展业辅助能力。

## 开发环境

- Node.js 18+
- MySQL 8.0
- 微信开发者工具
- AI 模型：GLM-5.1（开发阶段）、claude-haiku-4-5（生产环境）
- API 提供商：skyapi.org

## 关键配置

### API Key
从 `C:\Users\Administrator\Desktop\特定sky-api-key.txt` 读取：
```
sk-IYLvMglPbyVZ2848anldHhp69xj6eR7veumkGLtC4fKrCUOC
```

### 知识库路径
- 本地：`D:\寿险上分\0.知识库\`
- 服务器：`/data/knowledge/`（需手动同步）

### 项目目录
```
D:\寿险上分\wechat-miniprogram-insurance\
├── architecture.md          # 架构设计文档
├── task.json               # 任务分解文件
├── CLAUDE.md              # 本文件
├── backend/               # 后端代码
│   ├── app.js            # Express 主程序
│   ├── server.js         # 启动脚本
│   ├── .env              # 环境变量（不提交 git）
│   ├── .env.example      # 环境变量模板
│   ├── package.json
│   ├── ecosystem.config.js  # PM2 配置
│   ├── db/
│   │   ├── connection.js    # 数据库连接
│   │   ├── schema.sql       # 建表脚本
│   │   └── seed.sql         # 测试数据
│   ├── routes/
│   │   ├── auth.js          # 登录接口
│   │   ├── chat.js          # 对话接口
│   │   └── user.js          # 用户信息接口
│   ├── middleware/
│   │   └── auth.js          # JWT 鉴权中间件
│   ├── utils/
│   │   ├── jwt.js           # JWT 工具
│   │   ├── knowledge.js     # 知识库加载
│   │   ├── memory.js        # 用户记忆加载
│   │   ├── claude.js        # Claude API 调用
│   │   ├── rag.js           # v2 预留：RAG 模块
│   │   └── memory-updater.js # v2 预留：记忆自动更新
│   ├── data/
│   │   ├── knowledge/       # 知识库 md 文件
│   │   │   └── README.md
│   │   └── memories/        # 用户记忆文件
│   │       └── template.md
│   └── test/
│       └── api.test.js      # API 测试脚本
├── miniprogram/           # 小程序代码
│   ├── app.js
│   ├── app.json           # 全局配置
│   ├── app.wxss           # 全局样式
│   ├── config.js          # API 地址配置
│   ├── pages/
│   │   ├── login/         # 登录页
│   │   │   ├── login.wxml
│   │   │   ├── login.wxss
│   │   │   └── login.js
│   │   ├── chat/          # 对话页
│   │   │   ├── chat.wxml
│   │   │   ├── chat.wxss
│   │   │   └── chat.js
│   │   └── user/          # 用户中心
│   │       ├── user.wxml
│   │       ├── user.wxss
│   │       └── user.js
│   ├── utils/
│   │   └── request.js     # HTTP 请求封装
│   └── project.config.json # 小程序项目配置
├── README.md              # 开发文档
└── DEPLOY.md             # 部署文档
```

## 开发规范

### 代码风格
- 使用 ES6+ 语法
- 异步操作使用 async/await
- 错误处理使用 try-catch
- 所有函数添加简洁注释说明用途
- 变量命名使用驼峰命名法

### 安全规范
1. **敏感信息保护**
   - API Key 存储在 `.env` 文件，不提交 git
   - JWT 密钥使用强随机字符串（至少 32 位）
   - 数据库密码不硬编码

2. **接口安全**
   - 所有业务接口必须验证 JWT token
   - 对话历史按 openid 隔离，禁止跨用户访问
   - 白名单验证：邀请码必须与手机号匹配

3. **版权保护**
   - System prompt 明确要求转述知识库内容，禁止逐字引用
   - 小程序对话内容设置 `selectable="false"`
   - 对话界面添加水印"仅供内部学习使用"

### 错误处理
- 所有 API 接口统一返回格式：
  ```json
  {
    "success": true/false,
    "data": {},
    "message": "错误信息"
  }
  ```
- HTTP 状态码规范：
  - 200：成功
  - 400：参数错误
  - 401：未授权
  - 403：禁止访问
  - 500：服务器错误

## 核心模块实现要点

### 1. 知识库加载（backend/utils/knowledge.js）
```javascript
// 读取 /data/knowledge/ 目录下所有 .md 文件
// 递归遍历子目录
// 合并为单个字符串，用分隔符区分不同文件
// 缓存结果，避免每次请求都读取文件系统
```

### 2. Claude API 调用（backend/utils/claude.js）
```javascript
// 使用 axios 调用 skyapi.org
// Base URL: https://api.skyapi.org
// 模型：claude-haiku-4-5
// 支持流式返回（stream: true）
// System prompt 结构：
//   1. 角色定义
//   2. 知识库内容
//   3. 用户记忆
//   4. 回答要求（转述、简洁、口语化、版权保护）
// 启用 prompt caching（知识库部分标记为 cache_control）
```

### 3. 用户记忆加载（backend/utils/memory.js）
```javascript
// 读取 /data/memories/{openid}.md
// 如果文件不存在，返回空字符串
// 不自动创建文件（v1 仅读取）
```

### 4. 对话接口（POST /api/chat/send）
```javascript
// 1. 验证 JWT token，提取 openid
// 2. 从数据库加载最近 10 条对话历史（上下文）
// 3. 加载知识库和用户记忆
// 4. 构建 messages 数组：
//    - system: 知识库 + 用户记忆 + 回答要求
//    - 历史对话（user/assistant 交替）
//    - 当前用户消息
// 5. 调用 Claude API，流式返回
// 6. 保存用户消息和 AI 回复到数据库
```

### 5. 登录接口（POST /api/auth/login）
```javascript
// 1. 接收参数：code（微信登录凭证）、phone（手机号）、invite_code（邀请码）
// 2. 调用微信 API 换取 openid（wx.login → code2Session）
// 3. 验证白名单：
//    - 查询 invite_codes 表，检查 code 是否存在且未使用
//    - 检查 phone 是否与邀请码绑定的手机号一致
// 4. 如果验证通过：
//    - 标记邀请码为已使用
//    - 插入或更新 users 表
//    - 签发 JWT token（有效期 7 天）
// 5. 返回 token 和用户信息
```

### 6. 小程序对话页（miniprogram/pages/chat/chat.js）
```javascript
// 1. 页面加载时调用 /api/chat/history，渲染历史消息
// 2. 用户发送消息：
//    - 立即在界面显示用户消息
//    - 调用 /api/chat/send
//    - 如果后端支持 SSE，使用 EventSource 接收流式返回
//    - 如果不支持 SSE，使用轮询或等待完整响应
//    - 逐字渲染 AI 回复（打字机效果）
// 3. 消息列表自动滚动到底部
// 4. 输入框支持多行文本
```

## 环境变量配置（backend/.env）

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=insurance_assistant

# JWT 配置
JWT_SECRET=your_random_secret_key_at_least_32_chars

# Claude API 配置
CLAUDE_API_KEY=sk-IYLvMglPbyVZ2848anldHhp69xj6eR7veumkGLtC4fKrCUOC
CLAUDE_API_BASE=https://api.skyapi.org
CLAUDE_MODEL=claude-haiku-4-5

# 微信小程序配置
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret

# 服务器配置
PORT=3000
NODE_ENV=development

# 知识库路径
KNOWLEDGE_PATH=/data/knowledge
MEMORY_PATH=/data/memories
```

## 开发流程

### 阶段 1：后端开发（任务 1-5）
1. 初始化项目，安装依赖
2. 创建数据库表结构
3. 开发核心工具模块（JWT、知识库、Claude API）
4. 开发 API 路由
5. 整合主程序，本地测试

### 阶段 2：小程序开发（任务 6-9）
1. 创建登录页，实现手机号授权 + 邀请码验证
2. 创建对话页，实现消息发送和接收
3. 创建用户中心，展示用户信息
4. 配置全局文件和工具函数

### 阶段 3：测试与文档（任务 10-11）
1. 准备知识库文件和记忆模板
2. 编写 API 测试脚本
3. 编写部署文档和开发文档

### 阶段 4：v2 预留（任务 12）
1. 预留数据库字段
2. 创建 RAG 和记忆自动更新占位文件

## 测试要点

### 后端测试
1. 登录接口：
   - 正常流程：有效邀请码 + 匹配手机号 → 返回 token
   - 异常流程：无效邀请码、手机号不匹配、已使用的邀请码 → 返回错误
2. 对话接口：
   - 无 token → 401
   - 有效 token + 正常消息 → 返回 AI 回复
   - 知识库内容是否正确注入
   - 用户记忆是否正确加载
3. 历史对话接口：
   - 返回当前用户的历史消息
   - 不返回其他用户的消息（隔离性测试）

### 小程序测试
1. 登录流程：
   - 手机号授权 → 输入邀请码 → 登录成功 → 跳转对话页
2. 对话功能：
   - 发送消息 → 显示 AI 回复
   - 多轮对话上下文是否正确
   - 历史消息加载是否正常
3. 版权保护：
   - 长按消息无法复制
   - 水印是否显示

## 部署检查清单

### 服务器准备
- [ ] 安装 Node.js 18+
- [ ] 安装 MySQL 8.0
- [ ] 安装 nginx
- [ ] 安装 PM2
- [ ] 配置防火墙（开放 80、443 端口）

### 数据库初始化
- [ ] 创建数据库
- [ ] 执行 schema.sql 建表
- [ ] 插入邀请码数据

### 知识库同步
- [ ] 从 `D:\寿险上分\0.知识库\` 复制所有 md 文件到服务器 `/data/knowledge/`
- [ ] 检查文件权限（Node.js 进程可读）

### 后端部署
- [ ] 上传代码到服务器
- [ ] 配置 .env 文件
- [ ] 安装依赖 `npm install --production`
- [ ] 使用 PM2 启动 `pm2 start ecosystem.config.js`
- [ ] 检查进程状态 `pm2 status`

### nginx 配置
- [ ] 配置反向代理到 localhost:3000
- [ ] 配置 SSL 证书
- [ ] 重启 nginx

### 小程序配置
- [ ] 在微信公众平台配置服务器域名白名单
- [ ] 修改 miniprogram/config.js 中的 API 地址
- [ ] 上传代码到微信开发者工具
- [ ] 提交审核

## v2 迭代计划

### RAG 向量检索
- 使用 OpenAI text-embedding-3-small 或 BGE 模型向量化知识库
- 使用 chromadb 或 faiss 存储向量
- 根据用户问题检索 top-3 相关片段注入 prompt
- 预期效果：降低 token 成本 60%+，提升检索精度

### 记忆自动更新
- 每次对话结束后，调用 Claude API 分析对话内容
- 提取关键信息（用户画像、偏好、重要事件）
- 自动更新 `/data/memories/{openid}.md`
- 预期效果：AI 越用越懂用户

### 知识库自动同步
- 在本地 `D:\寿险上分\0.知识库\` 部署文件监听脚本
- 检测到 md 文件变化时，自动 rsync 到阿里云服务器
- 或使用 Git + webhook 实现自动部署

### 使用统计
- 在 users 表添加 chat_count 字段
- 每次对话后 +1
- 用户中心显示对话次数、活跃度
- 管理后台展示团队整体使用情况

### 管理后台
- 白名单管理：添加/删除邀请码
- 用户管理：查看用户列表、使用统计
- 知识库管理：在线编辑 md 文件
- 对话监控：查看高频问题、异常对话

## 注意事项

1. **开发阶段使用 GLM-5.1**，生产环境切换为 claude-haiku-4-5
2. **知识库版权保护**：prompt 必须明确要求转述，不得逐字引用
3. **用户隔离**：所有数据按 openid 隔离，严禁跨用户访问
4. **成本控制**：使用 prompt caching 降低重复 token 成本
5. **错误处理**：所有外部调用（数据库、API）必须 try-catch
6. **日志记录**：关键操作（登录、对话、错误）记录日志，便于排查问题

## 自动化执行命令

开发完成后，在项目根目录执行：

```bash
# 本地测试
cd backend
npm install
# 手动创建 .env 文件，填入配置
# 手动创建数据库并执行 schema.sql
npm start

# 部署到服务器（示例）
# 1. 上传代码
scp -r . user@server:/path/to/project

# 2. 服务器上执行
ssh user@server
cd /path/to/project/backend
npm install --production
pm2 start ecosystem.config.js
pm2 save
```

---

**开发完成标准：**
- 所有 task.json 中的任务完成
- 后端 API 测试通过
- 小程序本地运行正常
- README.md 和 DEPLOY.md 编写完整
- 代码提交到 Git 仓库

**交付物：**
1. 完整的后端代码（backend/）
2. 完整的小程序代码（miniprogram/）
3. 数据库脚本（schema.sql、seed.sql）
4. 部署文档（DEPLOY.md）
5. 开发文档（README.md）
