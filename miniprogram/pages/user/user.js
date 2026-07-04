Page({
  data: {
    user: {}
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    this.loadUserInfo();
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userProfile',
        data: { action: 'get' }
      });

      if (result.result.success) {
        const userData = result.result.data;
        // 计算使用天数
        const createdAt = userData.created_at;
        const days = createdAt ? Math.ceil((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        this.setData({
          user: {
            ...userData,
            days: Math.max(1, days)
          }
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 选择头像
  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 上传到云存储
        this.uploadAvatar(tempFilePath);
      },
      fail: (err) => {
        console.log('选择头像取消或失败:', err);
      }
    });
  },

  // 上传头像到云存储
  async uploadAvatar(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });

      // 获取用户 openid
      const accountResult = await wx.cloud.callFunction({
        name: 'userProfile',
        data: { action: 'get' }
      });

      const openid = accountResult.result.data._openid || 'unknown';

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `avatars/${openid}_${Date.now()}.jpg`,
        filePath: filePath
      });

      // 更新用户头像 URL
      await wx.cloud.callFunction({
        name: 'userProfile',
        data: {
          action: 'update',
          data: {
            avatar_url: uploadResult.fileID
          }
        }
      });

      // 更新本地显示
      this.setData({
        'user.avatar_url': uploadResult.fileID
      });

      wx.hideLoading();
      wx.showToast({
        title: '头像已更新',
        icon: 'success'
      });

    } catch (err) {
      console.error('上传头像失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '头像上传失败',
        icon: 'none'
      });
    }
  },

  // 清除对话
  onClearChat() {
    const sessionId = wx.getStorageSync('currentSessionId');
    wx.showActionSheet({
      itemList: ['清除当前对话记录', '清除历史对话记录', '清除全部记录'],
      itemColor: '#333',
      success: (res) => {
        const modeMap = { 0: 'current', 1: 'history', 2: 'all' };
        const labelMap = {
          0: '确定清除当前对话记录？清除后不可恢复。',
          1: '确定清除所有历史对话记录？当前对话不受影响。',
          2: '确定清除全部记录？所有对话将被删除且不可恢复。'
        };
        const mode = modeMap[res.tapIndex];
        wx.showModal({
          title: '提示',
          content: labelMap[res.tapIndex],
          confirmColor: '#FF3B30',
          success: async (modal) => {
            if (!modal.confirm) return;
            try {
              const result = await wx.cloud.callFunction({
                name: 'chatClear',
                data: { mode, session_id: sessionId }
              });
              if (result.result.success) {
                wx.showToast({ title: '清除成功', icon: 'success' });
                if (mode === 'current' || mode === 'all') {
                  // 当前 session 被清除，生成新 session
                  const newSessionId = Date.now().toString();
                  wx.setStorageSync('currentSessionId', newSessionId);
                  wx.setStorageSync('needRefreshChat', true);
                }
                this.loadUserInfo();
              } else {
                wx.showToast({ title: result.result.message || '清除失败', icon: 'none' });
              }
            } catch (err) {
              console.error('清除对话失败:', err);
              wx.showToast({ title: '网络错误', icon: 'none' });
            }
          }
        });
      }
    });
  },

  // 查看收藏夹
  onFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },

  // 打开设置
  onSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  onFeedback() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 只清除登录信息，保留 session 和对话历史索引
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          wx.reLaunch({ url: '/pages/login/login' });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }
});
