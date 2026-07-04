const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d4g1b3u4cd759b29d' });

const db = cloud.database();

exports.main = async (event, context) => {
  const { mode, session_id } = event;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '获取用户身份失败' };
  }

  try {
    if (mode === 'session') {
      if (!session_id) return { success: false, message: '缺少 session_id' };
      await db.collection('chats').where({ session_id }).remove();

      const userResult = await db.collection('users').where({ _openid: openid }).get();
      if (userResult.data.length > 0) {
        const current = userResult.data[0].chat_count || 0;
        await db.collection('users').doc(userResult.data[0]._id).update({
          data: { chat_count: Math.max(0, current - 1), updated_at: new Date() }
        });
      }

    } else if (mode === 'current') {
      if (!session_id) return { success: false, message: '缺少 session_id' };
      await db.collection('chats').where({ session_id }).remove();

    } else if (mode === 'history') {
      if (!session_id) return { success: false, message: '缺少 session_id' };
      const _ = db.command;
      await db.collection('chats').where({ session_id: _.neq(session_id) }).remove();

      const userResult = await db.collection('users').where({ _openid: openid }).get();
      if (userResult.data.length > 0) {
        await db.collection('users').doc(userResult.data[0]._id).update({
          data: { chat_count: 0, updated_at: new Date() }
        });
      }

    } else if (mode === 'all') {
      await db.collection('chats').where({ db.command.exists(true) }).remove();

      const userResult = await db.collection('users').where({ _openid: openid }).get();
      if (userResult.data.length > 0) {
        await db.collection('users').doc(userResult.data[0]._id).update({
          data: { chat_count: 0, updated_at: new Date() }
        });
      }

    } else {
      return { success: false, message: '无效的清除模式' };
    }

    return { success: true };

  } catch (error) {
    console.error('清除对话失败:', error);
    return { success: false, message: '清除失败，请重试' };
  }
};
