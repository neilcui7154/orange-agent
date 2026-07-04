// miniprogram/pages/favorites/favorites.js
const request = require('../../utils/request');

Page({
  data: {
    favorites: [],
    loading: false
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    this.loadFavorites();
  },

  // 加载收藏列表
  async loadFavorites() {
    this.setData({ loading: true });

    try {
      const res = await request({
        url: '/api/user/favorites',
        method: 'GET'
      });

      if (res.success) {
        this.setData({
          favorites: res.data.favorites || [],
          loading: false
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载收藏失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 删除收藏
  async onDelete(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '提示',
      content: '确定要删除这条收藏吗？',
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          try {
            const res = await request({
              url: '/api/user/favorite',
              method: 'DELETE',
              data: { id }
            });

            if (res.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadFavorites();
            } else {
              wx.showToast({
                title: res.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (err) {
            console.error('删除收藏失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});
