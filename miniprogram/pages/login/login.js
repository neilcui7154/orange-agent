const IS_DEV = true; // 生产环境改为 false

Page({
  data: {
    phone: '',
    inviteCode: '',
    isLoading: false
  },

  onLoad() {
    // 检查是否已登录（通过检查是否有用户信息）
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.phone) {
      wx.switchTab({ url: '/pages/chat/chat' });
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.trim() });
  },

  async onLogin() {
    const { phone, inviteCode } = this.data;

    // 验证手机号
    if (phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    // 验证邀请码
    if (!inviteCode) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });

    try {
      // 调用云函数登录
      const result = await wx.cloud.callFunction({
        name: 'authLogin',
        data: {
          phone: phone,
          inviteCode: inviteCode
        }
      });

      if (result.result.success) {
        // 保存用户信息到本地存储
        wx.setStorageSync('userInfo', result.result.data);

        wx.switchTab({ url: '/pages/chat/chat' });
      } else {
        wx.showToast({ title: result.result.message || '登录失败', icon: 'none' });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});
