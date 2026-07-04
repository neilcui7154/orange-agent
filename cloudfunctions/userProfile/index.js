// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-d4g1b3u4cd759b29d'
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event;

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
    if (action === 'get') {
      // 获取用户信息
      const userResult = await db.collection('users').where({
        _openid: openid
      }).get();

      if (userResult.data.length === 0) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      const user = userResult.data[0];

      return {
        success: true,
        data: {
          phone: user.phone,
          name: user.name || '',
          avatar_url: user.avatar_url || '',
          chat_count: user.chat_count || 0,
          created_at: user.created_at
        }
      };

    } else if (action === 'update') {
      // 更新用户信息
      const { name, avatar_url } = data;

      const userResult = await db.collection('users').where({
        _openid: openid
      }).get();

      if (userResult.data.length === 0) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      const userId = userResult.data[0]._id;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      updateData.updated_at = new Date();

      await db.collection('users').doc(userId).update({
        data: updateData
      });

      return {
        success: true,
        message: '更新成功'
      };

    } else {
      return {
        success: false,
        message: '未知操作'
      };
    }

  } catch (error) {
    console.error('用户中心操作失败:', error);
    return {
      success: false,
      message: '操作失败，请稍后重试'
    };
  }
};
