// AI API 调用工具（前端直接调用，无需云函数出站网络）
// 用法：在 chat.js 中引入并使用

let cachedConfig = null;

// 备用配置（硬编码，确保一定能用）
const BACKUP_CONFIG = {
  apiBase: 'https://api.skyapi.org',
  apiKey: 'sk-IYLvMglPbyVZ2848anldHhp69xj6eR7veumkGLtC4fKrCUOC',
  model: 'claude-haiku-4-5-20251001',
  authType: 'bearer'
};

// 获取 AI 配置（从云存储，失败则使用备用配置）
async function getAiConfig() {
  // 如果有缓存且有效，直接返回
  if (cachedConfig && cachedConfig.apiKey) {
    return cachedConfig;
  }

  try {
    // 尝试从云存储下载配置文件
    console.log('正在从云存储下载配置...');
    const downloadResult = await wx.cloud.downloadFile({
      fileID: 'cloud://cloud1-d4g1b3u4cd759b29d.636c-cloud1-d4g1b3u4cd759b29d-1428195732/ai-config.json'
    });
    
    const fs = wx.getFileSystemManager();
    const content = fs.readFileSync(downloadResult.tempFilePath, 'utf-8');
    const config = JSON.parse(content);
    
    // 验证配置是否有效
    if (config && config.apiKey) {
      console.log('从云存储加载配置成功');
      cachedConfig = config;
      return config;
    } else {
      console.warn('云存储配置无效，使用备用配置');
      return BACKUP_CONFIG;
    }
  } catch (err) {
    console.warn('从云存储加载配置失败，使用备用配置:', err.message || err.errMsg);
    return BACKUP_CONFIG;
  }
}

// 调用 AI API（前端直接请求）
async function callAiApi(message, systemPrompt, history) {
  const config = await getAiConfig();
  
  // 构建请求头
  let headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01'
  };

  if (config.authType === 'bearer') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else {
    headers['x-api-key'] = config.apiKey;
  }

  // 构建消息历史
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  // 使用 wx.request 发起请求（前端直接调用，无需云函数出站网络）
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBase}/v1/messages`,
      method: 'POST',
      header: headers,
      data: {
        model: config.model,
        max_tokens: 1024,
        messages: messages,
        stream: false
      },
      timeout: 30000,
      success(res) {
        console.log('AI API 响应状态码：', res.statusCode);
        console.log('AI API 响应数据：', res.data);
        
        if (res.statusCode === 200 && res.data) {
          const reply = res.data.content?.[0]?.text || '抱歉，暂无法回答。';
          resolve(reply);
        } else {
          console.error('AI 服务错误详情：', res);
          reject(new Error(`AI 服务错误: ${res.statusCode}, ${JSON.stringify(res.data)}`));
        }
      },
      fail(err) {
        console.error('网络错误详情：', err);
        reject(new Error(`网络错误: ${err.errMsg}`));
      }
    });
  });
}

module.exports = {
  callAiApi,
  getAiConfig
};
