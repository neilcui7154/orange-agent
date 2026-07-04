const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: 'cloud1-d4g1b3u4cd759b29d' });

const db = cloud.database();

const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.skyapi.org';
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';

exports.main = async (event, context) => {
  const { oldSessionId } = event;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '获取用户身份失败' };
  }

  // 生成新 session_id
  const newSessionId = Date.now().toString();

  try {
    // 如果有旧 session，生成标题并更新 chat_count
    if (oldSessionId) {
      // 取旧 session 前5条用户消息用于生成标题
      const historyResult = await db.collection('chats')
        .where({ session_id: oldSessionId, role: 'user' })
        .orderBy('created_at', 'asc')
        .limit(5)
        .get();

      if (historyResult.data.length > 0) {
        // 用 AI 生成标题
        let title = historyResult.data[0].content;
        title = title.length > 20 ? title.substring(0, 20) + '...' : title;

        if (AI_API_KEY) {
          try {
            const msgs = historyResult.data.map(m => m.content).join('；');
            const response = await axios.post(
              `${AI_API_BASE}/v1/messages`,
              {
                model: AI_MODEL,
                max_tokens: 30,
                system: '根据用户的问题，生成一个10字以内的中文标题，只输出标题文字，不加任何标点或说明。',
                messages: [{ role: 'user', content: msgs }]
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': AI_API_KEY,
                  'anthropic-version': '2023-06-01'
                },
                timeout: 15000
              }
            );
            const aiTitle = response.data?.content?.[0]?.text?.trim();
            if (aiTitle) title = aiTitle;
          } catch (e) {
            // AI 生成失败，降级用第一条消息截取
          }
        }

        // 把标题写入旧 session 第一条记录
        const firstMsg = await db.collection('chats')
          .where({ session_id: oldSessionId })
          .orderBy('created_at', 'asc')
          .limit(1)
          .get();

        if (firstMsg.data.length > 0) {
          await db.collection('chats').doc(firstMsg.data[0]._id).update({
            data: { session_title: title }
          });
        }

        // chat_count +1（归档一个 session）
        const userResult = await db.collection('users').where({ _openid: openid }).get();
        if (userResult.data.length > 0) {
          await db.collection('users').doc(userResult.data[0]._id).update({
            data: { chat_count: db.command.inc(1), updated_at: new Date() }
          });
        }
      }
    }

    return { success: true, data: { sessionId: newSessionId } };

  } catch (error) {
    console.error('newSession 错误:', error.message);
    return { success: true, data: { sessionId: newSessionId } };
  }
};
