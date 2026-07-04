// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-d4g1b3u4cd759b29d'
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取用户的 openid
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return {
      success: false,
      message: '获取用户身份失败'
    };
  }

  try {
    // 获取对话历史，按时间正序
    const result = await db.collection('chats')
      .where({ _openid: openid })
      .orderBy('created_at', 'asc')
      .limit(100)
      .get();

    return {
      success: true,
      data: {
        conversations: result.data
      }
    };

  } catch (error) {
    console.error('获取对话历史失败:', error);
    return {
      success: false,
      message: '获取对话历史失败'
    };
  }
};
