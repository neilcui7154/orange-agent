// miniprogram/pages/settings/settings.js
Page({
  data: {
    fontSizes: [
      { name: '小', value: 'small', size: 24 },
      { name: '中', value: 'medium', size: 28 },
      { name: '大', value: 'large', size: 32 }
    ],
    fontSize: 'medium',
    cacheSize: '0 KB'
  },

  onLoad() {
    this.loadSettings();
    this.calculateCacheSize();
  },

  // 加载设置
  loadSettings() {
    const fontSize = wx.getStorageSync('fontSize') || 'medium';
    this.setData({ fontSize });
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const res = wx.getStorageInfoSync();
      const size = (res.currentSize || 0) + ' KB';
      this.setData({ cacheSize: size });
    } catch (err) {
      console.error('计算缓存失败:', err);
      this.setData({ cacheSize: '未知' });
    }
  },

  // 字体大小切换
  onFontSizeChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ fontSize: value });
    wx.setStorageSync('fontSize', value);

    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          try {
            // 保留登录信息和 session ID，只清除其他缓存
            const userInfo = wx.getStorageSync('userInfo');
            const currentSessionId = wx.getStorageSync('currentSessionId');
            const pinnedSessions = wx.getStorageSync('pinnedSessions');
            wx.clearStorageSync();
            if (userInfo) wx.setStorageSync('userInfo', userInfo);
            if (currentSessionId) wx.setStorageSync('currentSessionId', currentSessionId);
            if (pinnedSessions) wx.setStorageSync('pinnedSessions', pinnedSessions);
            this.setData({ cacheSize: '0 KB' });
            wx.showToast({ title: '清除成功', icon: 'success' });
          } catch (err) {
            console.error('清除缓存失败:', err);
            wx.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 检查更新
  onCheckUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          wx.showModal({
            title: '发现新版本',
            content: '是否立即更新？',
            success: (res) => {
              if (res.confirm) {
                updateManager.applyUpdate();
              }
            }
          });
        } else {
          wx.showToast({
            title: '已经是最新版本',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '当前版本不支持',
        icon: 'none'
      });
    }
  },

  // 关于我们
  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '智能保险助手 v1.0.0\n\n为您提供专业的保险咨询服务',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
