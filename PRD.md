# 橙司保贝 产品需求文档

**版本**：v1.0  
**日期**：2026-04-28  
**产品类型**：微信小程序  
**目标用户**：平安人寿保险代理人团队（约30+人）

---

## 一、产品概述

橙司保贝是一款面向保险代理人团队的内部工具，提供基于 AI 的展业辅助对话能力。代理人可通过小程序向 AI 提问，获取保险产品知识、销售话术、客户服务等方面的专业建议。

---

## 二、用户角色

只有一种角色：**代理人**（白名单用户）。非白名单用户无法登录。

---

## 三、页面与功能

### 3.1 登录页

**页面元素**：
- Logo + 产品名称
- 手机号输入框（数字键盘，11位）
- 邀请码输入框
- 登录按钮（手机号和邀请码均填写后可点击）

**登录流程**：
1. 用户填写手机号 + 邀请码，点击登录
2. 调用微信 `wx.login` 获取 code
3. 将 code + 手机号 + 邀请码发送到后端
4. 后端验证通过后返回 JWT token
5. 本地存储 token，跳转到对话页

**验证规则**：
- 手机号与邀请码必须匹配（白名单中一一对应）
- 同一邀请码只能绑定同一个微信账号（openid）
- 已登录用户（本地有有效 token）直接跳过登录页

**错误提示**：
- 手机号格式不正确
- 邀请码无效或手机号不匹配
- 邀请码已被他人使用

---

### 3.2 对话页（核心页）

**页面元素**：
- 顶部标题栏
- 消息列表区域（可滚动）
- 半透明水印"仅供内部学习使用"
- 底部输入框 + 发送按钮

**功能说明**：

| 功能 | 说明 |
|------|------|
| 加载历史 | 页面打开时自动加载最近 50 条历史对话 |
| 发送消息 | 用户输入后点击发送，立即显示用户消息气泡 |
| AI 回复 | 后端调用 AI 生成回复，显示在消息列表中 |
| 自动滚动 | 每次新消息出现后，列表自动滚动到底部 |
| 加载状态 | 等待 AI 回复时显示"AI 正在思考..."，禁用输入框 |

**版权保护**：
- 所有消息气泡禁止长按复制（`selectable="false"`）
- 页面固定显示水印

**消息气泡样式**：
- 用户消息：右对齐，橙色背景
- AI 消息：左对齐，白色背景，带 Logo 头像

---

### 3.3 用户中心页

**展示信息**：
- 手机号
- 注册时间

**操作**：
- 退出登录：清除本地 token 和用户信息，跳转登录页

---

## 四、底部导航栏（TabBar）

| Tab | 图标 | 页面 |
|-----|------|------|
| 对话 | chat.png / chat-active.png | pages/chat/chat |
| 我的 | user.png / user-active.png | pages/user/user |

---

## 五、后端接口

### 5.1 登录接口

**POST** `/api/auth/login`

请求参数：
```json
{
  "code": "wx.login 返回的 code",
  "phone": "17621797154",
  "invite_code": "1A605EA89D1DFA07"
}
```

成功响应：
```json
{
  "success": true,
  "data": {
    "token": "JWT token（有效期7天）",
    "user": { "openid": "...", "phone": "...", "created_at": "..." }
  }
}
```

---

### 5.2 发送消息

**POST** `/api/chat/send`  
Header: `Authorization: Bearer <token>`

请求参数：
```json
{ "message": "用户消息内容" }
```

成功响应：
```json
{
  "success": true,
  "data": { "reply": "AI 回复内容" }
}
```

---

### 5.3 获取历史对话

**GET** `/api/chat/history?page=1&limit=50`  
Header: `Authorization: Bearer <token>`

成功响应：
```json
{
  "success": true,
  "data": {
    "history": [
      { "id": 1, "role": "user", "content": "...", "created_at": "..." },
      { "id": 2, "role": "assistant", "content": "...", "created_at": "..." }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 10, "totalPages": 1 }
  }
}
```

---

### 5.4 获取用户信息

**GET** `/api/user/profile`  
Header: `Authorization: Bearer <token>`

成功响应：
```json
{
  "success": true,
  "data": { "openid": "...", "phone": "...", "created_at": "..." }
}
```

---

### 5.5 统一错误格式

```json
{ "success": false, "message": "错误描述" }
```

HTTP 状态码：400（参数错误）、401（未授权）、403（禁止访问）、500（服务器错误）

---

## 六、数据库设计

### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| openid | VARCHAR(100) UNIQUE | 微信 openid |
| phone | VARCHAR(20) | 手机号 |
| created_at | TIMESTAMP | 注册时间 |

### invite_codes 表（白名单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| code | VARCHAR(50) UNIQUE | 邀请码 |
| phone | VARCHAR(20) | 绑定手机号 |
| is_used | TINYINT(1) | 是否已使用 |
| used_by | VARCHAR(100) | 使用者 openid |

### chats 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| openid | VARCHAR(100) | 用户 openid |
| role | ENUM('user','assistant') | 消息角色 |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 创建时间 |

---

## 七、AI 配置

| 配置项 | 值 |
|--------|-----|
| 模型 | claude-haiku-4-5 |
| API 提供商 | skyapi.org（中转） |
| 知识库 | 服务器 `/data/knowledge/` 目录下所有 .md 文件 |
| 用户记忆 | `/data/memories/{openid}.md`（只读） |
| 上下文长度 | 最近 10 条历史对话 |

**System Prompt 结构**：
1. 角色定义（保险代理人助手）
2. 知识库内容（启用 prompt caching）
3. 用户记忆
4. 回答要求（转述、简洁、口语化、版权保护）

---

## 八、非功能需求

- JWT 有效期：7 天
- 数据隔离：所有对话数据按 openid 严格隔离
- 知识库缓存：5 分钟内不重复读取文件
- 版权保护：AI 必须转述知识库内容，禁止逐字引用
- 白名单管理：通过 Excel 导入脚本批量维护

---

## 九、部署环境

| 组件 | 要求 |
|------|------|
| 服务器 | 阿里云，Node.js 18+，PM2 |
| 数据库 | MySQL 8.0 |
| 反向代理 | nginx + SSL 证书 |
| 小程序后台 | 配置服务器域名白名单（HTTPS） |
