// miniprogram/config.js
// 后端 API 配置

const config = {
  // 开发环境
  development: {
    apiBase: 'http://localhost:3000'  // 真机测试改为 http://192.168.43.25:3000
  },

  // 生产环境
  production: {
    apiBase: 'https://your-domain.com' // 替换为实际的服务器域名
  }
};

// 根据环境选择配置
const env = 'development'; // 部署时改为 'production'

module.exports = config[env];
