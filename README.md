# 橙司保贝 — AI Insurance Agent Assistant

WeChat Mini-Program AI assistant for insurance agents. Built to help agents instantly query Ping An product details, benefit rules, and generate sales scripts — all through natural language conversation.

## Architecture

- **Frontend**: WeChat native mini-program framework
- **Backend**: WeChat Cloud Functions (Node.js 18+), Cloud Development environment
- **AI**: Large Language Model via API proxy + custom RAG knowledge base (~48,000 characters of insurance domain knowledge)
- **Database**: WeChat Cloud Database (collections: users, invite_codes, chats, favorites)

## Key Features

- Multi-turn AI conversation with insurance domain RAG
- Multi-session management with AI-generated titles
- Whitelist authentication (phone + invite code)
- Structured JSON AI responses with guided option buttons
- Typewriter effect for AI replies
- PII anonymization in responses
- Favorites and search functionality

## Cloud Functions (8)

| Function | Purpose |
|----------|---------|
| authLogin | Phone + invite code authentication |
| chatSend | AI conversation with knowledge base injection |
| newSession | Archive old session, generate AI title |
| chatHistory | Retrieve chat history |
| chatClear | Clear conversations (4 modes) |
| userFavorites | Favorite management |
| userProfile | User profile CRUD |
| importInviteCodes | Batch import invite whitelist |

## Key Discovery: Compliance Wall

This project was awarded the sole "Outstanding Case" by Ping An HQ's AI Innovation Camp. However, during deployment, we discovered a structural compliance boundary: insurance agents cannot use external tools to present benefit information to clients. This finding became more valuable than the tool itself — it revealed that the organization's true need was internal AI capability, not external tools.

## Disclaimer

This is a personal project built by the author during off-hours. It is not an official Ping An product. All knowledge base content is publicly available insurance product information.

## Author

Neil Cui — Insurance Frontline Manager × AI Builder.
