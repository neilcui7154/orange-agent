// 测试网络连通性
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: 'cloud1-d4g1b3u4cd759b29d'
});

exports.main = async (event, context) => {
  const results = {};

  // 测试 1: DNS 解析
  try {
    const dns = require('dns');
    const addresses = await new Promise((resolve, reject) => {
      dns.lookup('api.skyapi.org', (err, address, family) => {
        if (err) reject(err);
        else resolve({ address, family });
      });
    });
    results.dnsLookup = { success: true, ...addresses };
  } catch (err) {
    results.dnsLookup = { success: false, error: err.message };
  }

  // 测试 2: HTTP 请求（不验证 SSL）
  try {
    const response = await axios.get('https://api.skyapi.org/', {
      timeout: 5000,
      validateStatus: () => true // 接受任何状态码
    });
    results.httpGet = { success: true, status: response.status, data: typeof response.data };
  } catch (err) {
    results.httpGet = { success: false, error: err.message, code: err.code };
  }

  // 测试 3: 访问百度（确认基础网络）
  try {
    const response = await axios.get('https://www.baidu.com/', {
      timeout: 5000,
      validateStatus: () => true
    });
    results.baiduAccess = { success: true, status: response.status };
  } catch (err) {
    results.baiduAccess = { success: false, error: err.message, code: err.code };
  }

  return {
    success: true,
    data: results,
    env: {
      hasApiKey: !!process.env.CLAUDE_API_KEY,
      apiBase: process.env.CLAUDE_API_BASE
    }
  };
};
