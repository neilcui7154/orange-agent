const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: 'cloud1-d4g1b3u4cd759b29d' });

const db = cloud.database();

// 知识库文件 ID（云存储）
const KNOWLEDGE_FILE_IDS = [
  'cloud://cloud1-d4g1b3u4cd759b29d.636c-cloud1-d4g1b3u4cd759b29d-1428195732/基本技能合集.md',
  'cloud://cloud1-d4g1b3u4cd759b29d.636c-cloud1-d4g1b3u4cd759b29d-1428195732/权益合集.md'
];

// 模块级缓存，同一实例复用时只下载一次
let cachedKnowledge = null;

async function loadKnowledge() {
  if (cachedKnowledge !== null) return cachedKnowledge;

  let text = '';
  for (const fileID of KNOWLEDGE_FILE_IDS) {
    try {
      const res = await cloud.downloadFile({ fileID });
      text += '\n\n' + res.fileContent.toString('utf-8');
    } catch (err) {
      console.warn('知识库下载失败:', fileID, err.message);
    }
  }

  cachedKnowledge = text;
  return cachedKnowledge;
}

// AI 配置从云函数环境变量读取，Key 不出现在代码里
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.skyapi.org';
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `你的任务是帮助橙司人寿保险代理人解答工作中的问题，包括权益查询、产品说明、客户异议处理等场景，如果遇到不清楚的，可以直接提出疑似用户提出的问题。

【输出格式要求】
必须严格返回 JSON 格式，不得在 JSON 外输出任何文字：
{"reply": "回答内容", "options": []}
或当需要给出选项时：
{"reply": "引导语", "options": ["选项A", "选项B", "选项C"]}

【何时给出选项】
以下情况必须给出2-4个选项，不直接回答：
- 问题指向不明：如"重疾怎么赔"（不知道问流程、金额还是条件）
- 涉及多个产品：如"万能险怎么样"（不知道问哪款）
- 问题过于宽泛：如"权益有哪些"（范围太大需缩小）
- 专业术语有歧义：如"减保怎么操作"（减保额还是减保费）

【何时直接回答】
以下情况直接回答，options 返回空数组：
- 问题具体明确：如"橙e享的等待期是多少天"
- 操作类问题：如"怎么提交理赔申请"
- 用户刚选了选项后的追问
- 是/否类问题

【回答要求】
1. 只根据下方知识库内容作答，用自己的话转述，不得逐字引用原文
2. 只能使用中文回答，简洁实用，口语化表达
3. 如果知识库中没有相关信息，reply 返回："暂无相关资料，建议咨询公司官方客服"
4. 不做跨保险公司产品对比
5. 不提供具体的保费计算结果

【人名与案例处理规则】
6. 回答中涉及任何真实人名时，必须替换为随机虚构的中文姓名（如"李女士"、"张先生"等）
7. 回答中涉及任何真实案例时，必须对细节进行二次创造：金额、时间、地点、职业等具体信息均需改编
8. 不得以任何方式暗示或透露原始人名和案例来源`;

exports.main = async (event, context) => {
  const { message, session_id } = event;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '获取用户身份失败' };
  }

  if (!message) {
    return { success: false, message: '消息内容不能为空' };
  }

  if (!AI_API_KEY) {
    return { success: false, message: 'AI 服务未配置，请联系管理员' };
  }

  if (!session_id) {
    return { success: false, message: '会话ID缺失' };
  }

  try {
    // 获取当前 session 的对话历史（最近10条）
    const historyResult = await db.collection('chats')
      .where({ session_id })
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();

    const history = historyResult.data.reverse().map(item => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.content
    }));

    // 构建系统提示词（云函数内部加载知识库）
    const knowledge = await loadKnowledge();
    let systemPrompt = SYSTEM_PROMPT;
    if (knowledge) {
      systemPrompt += `\n\n## 参考知识库\n${knowledge}`;
    }

    // 构建消息数组
    const messages = [...history, { role: 'user', content: message }];

    // 调用 Claude API
    const response = await axios.post(
      `${AI_API_BASE}/v1/messages`,
      {
        model: AI_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AI_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 50000
      }
    );

    const rawText = response.data?.content?.[0]?.text;
    if (!rawText) {
      return { success: false, message: 'AI 回复格式异常，请重试' };
    }

    // 解析 JSON，容错处理
    let reply = '';
    let options = [];
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      reply = parsed.reply || rawText;
      options = Array.isArray(parsed.options) ? parsed.options.filter(o => typeof o === 'string' && o.trim()) : [];
    } catch (e) {
      // JSON 解析失败，降级为纯文本
      reply = rawText;
      options = [];
    }

    const finalReply = reply + '\n\n---\n如有疑问请以公司官方条款为准';

    // 保存用户消息和 AI 回复（存干净的 reply，不含免责声明，避免污染上下文）
    try {
      const r1 = await db.collection('chats').add({
        data: { role: 'user', content: message, session_id, created_at: new Date(), _openid: openid }
      });
      const r2 = await db.collection('chats').add({
        data: { role: 'assistant', content: reply, session_id, created_at: new Date(), _openid: openid }
      });
      console.log('写入成功 user._id=', r1._id, 'assistant._id=', r2._id);
    } catch (saveErr) {
      console.error('写入数据库失败:', saveErr.message);
    }

    return { success: true, data: { reply: finalReply, options } };

  } catch (error) {
    console.error('chatSend 错误:', error.response?.data || error.message);

    let msg = '对话失败，请稍后重试';
    if (error.response?.status === 401) msg = 'AI 服务认证失败，请联系管理员';
    else if (error.response?.status === 429) msg = 'AI 服务繁忙，请稍后重试';
    else if (error.code === 'ECONNABORTED') msg = '请求超时，请重试';

    return { success: false, message: msg };
  }
};
