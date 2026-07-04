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
    if (action === 'add') {
      // 添加收藏
      const { chat_id, content } = data;

      if (!content) {
        return {
          success: false,
          message: '收藏内容不能为空'
        };
      }

      const newFavorite = {
        _openid: openid,
        chat_id: chat_id || null,
        content: content,
        created_at: new Date()
      };

      const result = await db.collection('favorites').add({
        data: newFavorite
      });

      return {
        success: true,
        message: '收藏成功',
        data: {
          id: result._id
        }
      };

    } else if (action === 'list') {
      // 获取收藏列表
      const result = await db.collection('favorites')
        .where({ _openid: openid })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();

      return {
        success: true,
        data: {
          favorites: result.data
        }
      };

    } else if (action === 'delete') {
      // 删除收藏
      const { id } = data;

      if (!id) {
        return {
          success: false,
          message: '收藏ID不能为空'
        };
      }

      // 验证该收藏属于当前用户
      const favResult = await db.collection('favorites').doc(id).get();

      if (favResult.data._openid !== openid) {
        return {
          success: false,
          message: '无权删除该收藏'
        };
      }

      await db.collection('favorites').doc(id).remove();

      return {
        success: true,
        message: '删除成功'
      };

    } else {
      return {
        success: false,
        message: '未知操作'
      };
    }

  } catch (error) {
    console.error('收藏操作失败:', error);
    return {
      success: false,
      message: '操作失败，请稍后重试'
    };
  }
};
