// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-d4g1b3u4cd759b29d'
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { phone, inviteCode } = event;

  // 获取用户的 openid
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return {
      success: false,
      message: '获取用户身份失败，请稍后重试'
    };
  }

  if (!phone || !inviteCode) {
    return {
      success: false,
      message: '手机号和邀请码不能为空'
    };
  }

  try {
    // 查询邀请码是否存在
    const inviteResult = await db.collection('invite_codes').where({
      code: inviteCode,
      phone: phone
    }).get();

    if (inviteResult.data.length === 0) {
      return {
        success: false,
        message: '邀请码或手机号错误，请核对后重试'
      };
    }

    const inviteData = inviteResult.data[0];

    // 检查邀请码是否已被其他人使用（不是同一个 openid）
    if (inviteData.is_used === 1 && inviteData.used_by !== openid) {
      return {
        success: false,
        message: '该邀请码已被其他用户使用'
      };
    }

    // 查询用户是否已存在
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get();

    const now = new Date();
    let userId;

    if (userResult.data.length > 0) {
      // 用户已存在，更新信息
      userId = userResult.data[0]._id;
      await db.collection('users').doc(userId).update({
        data: {
          phone: phone,
          updated_at: now
        }
      });
    } else {
      // 新用户，创建记录
      const newUser = {
        _openid: openid,
        phone: phone,
        name: null,
        avatar_url: null,
        chat_count: 0,
        created_at: now,
        updated_at: now
      };

      const addResult = await db.collection('users').add({
        data: newUser
      });

      userId = addResult._id;
    }

    // 更新邀请码使用状态（允许同一个 openid 重复使用）
    await db.collection('invite_codes').doc(inviteData._id).update({
      data: {
        is_used: 1,
        used_by: openid,
        used_at: now
      }
    });

    // 获取更新后的用户信息
    const userInfo = await db.collection('users').doc(userId).get();

    return {
      success: true,
      message: '登录成功',
      data: {
        openid: openid,
        phone: phone,
        name: userInfo.data.name,
        avatar_url: userInfo.data.avatar_url
      }
    };

  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
};
