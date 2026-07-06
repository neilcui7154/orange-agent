# 橙司保贝 — AI 保险代理人助手

> 把绩优代理人的判断经验，变成 AI 可以规模化输出的能力。

中国 290 万保险代理人正在经历 K 型分化。我在平安人寿上海一线管理 200+ 人团队 8 年，业余独立完成了这个小程序——从需求定义、全栈开发到嵌入代理人真实工作流验证，一个人交付。

**平安总部 AI 创造营获评「优秀小组」，评审组高度认可。**

---

## 项目定位

这不是通用 AI 产品，是嵌在特定用户画像、特定业务场景里的领域 Agent。核心探索：AI 如何在保险代理人场景中作为「助手」存在——不是替代人，是增强人的判断力。

## 功能

- **权益智能问答**：输入客户年龄、需求 → AI 匹配平安权益体系并给出建议
- **展业话术生成**：根据具体场景（开门红/续期/转介绍）生成话术
- **知识库检索**：结构化保险产品/权益/规则知识，自然语言查询
- **多会话管理**：每个代理人独立会话空间，支持历史回溯

## 技术架构

| 层 | 技术栈 |
|:---|:---|
| 前端 | 微信小程序原生框架 |
| 后端 | 微信云开发（云函数 Node.js 18+ + 云数据库） |
| AI 模型 | DeepSeek V4 Pro / Claude Sonnet 4.6 / Claude Opus 4.6 |
| 知识库 | RAG，~48,000 字保险领域结构化知识 |
| 会话管理 | 多会话归档 + AI 自动生成标题 |

## 云函数（8 个）

| 函数 | 用途 |
|:---|:---|
| authLogin | 手机号 + 邀请码认证 |
| chatSend | AI 对话（含知识库注入） |
| newSession | 归档旧会话，AI 生成标题 |
| chatHistory | 检索对话历史 |
| chatClear | 清空会话（4 种模式） |
| userFavorites | 收藏管理 |
| userProfile | 用户信息管理 |
| importInviteCodes | 批量导入邀请白名单 |

## 关键发现：合规墙

本项目在平安 AI 创造营获评「优秀小组」并获评审组认可。但部署过程中发现了一个结构性边界：保险代理人不可使用外部工具向客户展示权益信息。**这个发现本身比工具更有价值**——它揭示出组织真正的需求是内部 AI 能力建设，而非外部工具。

## 作者

**崔韩凯（Neil Cui）** — 保险一线管理者 × AI 全栈建造者。

8 年平安人寿上海分公司经验，管理 200+ 人代理人团队。业余独立完成 AI 全栈交付：发现问题 → 开发 → 部署 → 现场验证，一个人走完 FDE（前线部署工程师）闭环。

---

# Orange Agent — AI Insurance Agent Assistant

> Turning top agents' judgment expertise into AI capabilities that scale.

China's 2.9 million insurance agents are undergoing K-shaped polarization. During 8 years managing a 200+ agent team at Ping An Life Shanghai, I built this mini-program solo — from requirement discovery through full-stack development to real-world workflow validation.

**Recognized as "Outstanding Team" by Ping An HQ AI Innovation Camp.**

## Project Positioning

Not a generic AI product — a domain Agent embedded in specific user profiles and business scenarios. Core exploration: how AI can serve as an "assistant" for insurance agents — augmenting human judgment, not replacing it.

## Features

- **Benefits Q&A**: Input client age/needs → AI matches Ping An benefits and gives recommendations
- **Sales Script Generation**: Context-aware scripts for specific scenarios
- **Knowledge Base Search**: Structured insurance knowledge, natural language queries
- **Multi-Session Management**: Independent chat spaces per agent with history

## Architecture

| Layer | Stack |
|:---|:---|
| Frontend | WeChat native mini-program |
| Backend | WeChat Cloud Functions (Node.js 18+) + Cloud DB |
| AI Models | DeepSeek V4 Pro / Claude Sonnet 4.6 / Claude Opus 4.6 |
| Knowledge | RAG, ~48K chars insurance domain knowledge |
| Sessions | Multi-session archive + AI auto-titling |

## Cloud Functions (8)

| Function | Purpose |
|:---|:---|
| authLogin | Phone + invite code authentication |
| chatSend | AI conversation with knowledge base injection |
| newSession | Archive session, generate AI title |
| chatHistory | Retrieve chat history |
| chatClear | Clear conversations (4 modes) |
| userFavorites | Favorite management |
| userProfile | User profile CRUD |
| importInviteCodes | Batch import invite whitelist |

## Key Discovery: The Compliance Wall

This project was recognized as an "Outstanding Team" at Ping An HQ's AI Innovation Camp. During deployment, we hit a structural boundary: insurance agents cannot use external tools to present benefit information to clients. **This finding proved more valuable than the tool itself** — it revealed that the organization's real need is internal AI capability, not external tools.

## Author

**Neil Cui (崔韩凯)** — Insurance Frontline Manager × AI Builder.

8 years at Ping An Life Shanghai, managing 200+ agents. Built this solo during off-hours: discover → build → deploy → validate. One person, full FDE (Forward Deployed Engineer) loop.
