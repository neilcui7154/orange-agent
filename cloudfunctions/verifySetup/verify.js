// 验证云开发配置
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-d4g1b3u4cd759b29d'
});

const db = cloud.database();

// 云函数入口
exports.main = async (event, context) => {
  const result = {
    success: true,
    checks: []
  };

  // 1. 检查数据库集合
  try {
    const collections = ['users', 'invite_codes', 'chats', 'favorites'];

    for (const coll of collections) {
      try {
        const count = await db.collection(coll).count();
        result.checks.push({
          name: `数据库集合: ${coll}`,
          status: '✓ 通过',
          detail: `记录数: ${count.total}`
        });
      } catch (e) {
        result.checks.push({
          name: `数据库集合: ${coll}`,
          status: '✗ 失败',
          detail: e.message
        });
        result.success = false;
      }
    }
  } catch (e) {
    result.checks.push({
      name: '数据库连接',
      status: '✗ 失败',
      detail: e.message
    });
    result.success = false;
  }

  // 2. 检查邀请码数据
  try {
    const inviteResult = await db.collection('invite_codes').limit(10).get();
    result.checks.push({
      name: '邀请码数据',
      status: inviteResult.data.length > 0 ? '✓ 通过' : '⚠️ 警告',
      detail: `找到 ${inviteResult.data.length} 条记录`
    });
  } catch (e) {
    result.checks.push({
      name: '邀请码数据',
      status: '✗ 失败',
      detail: e.message
    });
    result.success = false;
  }

  // 3. 检查云存储中的知识库文件
  try {
    const fileList = await cloud.getTempFileURL({
      fileList: ['cloud://cloud1-d4g1b3u4cd759b29d.knowledge/knowledge_all.md']
    });

    if (fileList.fileList && fileList.fileList.length > 0 && !fileList.fileList[0].status) {
      result.checks.push({
        name: '知识库文件',
        status: '✓ 通过',
        detail: `File ID: ${fileList.fileList[0].fileID}`
      });
    } else {
      result.checks.push({
        name: '知识库文件',
        status: '✗ 失败',
        detail: '文件不存在或无法访问'
      });
      result.success = false;
    }
  } catch (e) {
    result.checks.push({
      name: '知识库文件',
      status: '✗ 失败',
      detail: e.message
    });
    result.success = false;
  }

  // 4. 检查云函数是否存在（无法从代码内检查，需要手动验证）

  return result;
};
