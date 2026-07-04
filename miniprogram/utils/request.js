// miniprogram/utils/request.js
// HTTP 请求封装

const config = require('../config');

/**
 * 封装 wx.request
 * @param {Object} options - 请求参数
 * @returns {Promise}
 */
function request(options) {
  return new Promise((resolve, reject) => {
    // 获取 token
    const token = wx.getStorageSync('token');

    // 构建请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    // 如果有 token，添加到请求头
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    // 发起请求
    wx.request({
      url: config.apiBase + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      success: (res) => {
        // 处理响应
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token 失效，跳转到登录页
          wx.showToast({
            title: '登录已过期',
            icon: 'none'
          });

          wx.clearStorageSync();
          wx.redirectTo({
            url: '/pages/login/login'
          });

          reject(new Error('未授权'));
        } else {
          wx.showToast({
            title: res.data.message || '请求失败',
            icon: 'none'
          });
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        reject(error);
      }
    });
  });
}

module.exports = request;
