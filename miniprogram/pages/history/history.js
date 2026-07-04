const SWIPE_THRESHOLD = 30;   // 触发滑动的最小距离
const SWIPE_OPEN_X = -160;    // 滑开后的偏移量（px，对应两个按钮宽度）

Page({
  data: {
    sessions: [],
    keyword: '',
    loading: false,
    activeIndex: -1,   // 当前滑开的条目索引
    touchStartX: 0,
    touchStartY: 0,
    isSwiping: false
  },

  onLoad() {
    this.loadSessions();
  },

  onShow() {
    this.loadSessions();
  },

  async loadSessions() {
    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();

      // 先查总数确认权限
      const countRes = await db.collection('chats').count();
      console.log('[loadSessions] chats集合总数:', countRes.total);

      // 取当前用户所有有 session_id 的记录，找每个 session 的第一条
      const res = await db.collection('chats')
        .where({ session_id: db.command.exists(true) })
        .orderBy('created_at', 'asc')
        .limit(200)
        .get();

      const sessionMap = {};
      for (const item of res.data) {
        if (!sessionMap[item.session_id]) {
          sessionMap[item.session_id] = item;
        }
      }

      console.log('[loadSessions] 查到记录数:', res.data.length, '去重后session数:', Object.keys(sessionMap).length);

      const currentSessionId = wx.getStorageSync('currentSessionId');
      const pinnedIds = wx.getStorageSync('pinnedSessions') || [];

      let sessions = Object.values(sessionMap)
        .map(item => {
          const content = item.content || '';
          return {
            sessionId: item.session_id,
            title: item.session_title || (content.length > 24 ? content.substring(0, 24) + '...' : content) || '(无标题)',
            date: formatDate(new Date(item.created_at)),
            is_pinned: pinnedIds.includes(item.session_id),
            is_current: item.session_id === currentSessionId,
            offsetX: 0,
            transitioning: false
          };
        });

      // 置顶的排在前面，其余按时间倒序
      sessions.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });
      // 非置顶部分保持倒序（已经是倒序了，reverse 非置顶）
      const pinned = sessions.filter(s => s.is_pinned);
      const unpinned = sessions.filter(s => !s.is_pinned).reverse();
      sessions = [...pinned, ...unpinned];

      if (this.data.keyword) {
        sessions = sessions.filter(s => s.title.includes(this.data.keyword));
      }

      this.setData({ sessions, loading: false, activeIndex: -1 });

    } catch (err) {
      console.error('[loadSessions] 失败:', err.message, err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // ===== 右滑手势 =====
  onTouchStart(e) {
    this.data.touchStartX = e.touches[0].clientX;
    this.data.touchStartY = e.touches[0].clientY;
    this.data.isSwiping = false;
  },

  onTouchMove(e) {
    const dx = e.touches[0].clientX - this.data.touchStartX;
    const dy = e.touches[0].clientY - this.data.touchStartY;

    // 纵向滑动超过横向时，不处理（让 scroll-view 滚动）
    if (!this.data.isSwiping && Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      this.data.isSwiping = true;
    }
    if (!this.data.isSwiping) return;

    const index = parseInt(e.currentTarget.dataset.index);
    const sessions = this.data.sessions;

    // 关闭其他已滑开的条目
    if (this.data.activeIndex !== -1 && this.data.activeIndex !== index) {
      this._closeItem(this.data.activeIndex);
    }

    const currentOffset = sessions[index].offsetX || 0;
    let newOffset = currentOffset + dx - (this.data.lastDx || 0);
    newOffset = Math.max(SWIPE_OPEN_X, Math.min(0, newOffset));

    this.data.lastDx = dx;

    const key = `sessions[${index}].offsetX`;
    this.setData({ [key]: newOffset });
  },

  onTouchEnd(e) {
    if (!this.data.isSwiping) return;
    this.data.lastDx = 0;
    this.data.isSwiping = false;

    const index = parseInt(e.currentTarget.dataset.index);
    const offset = this.data.sessions[index].offsetX || 0;

    // 超过一半则完全滑开，否则收回
    if (offset < SWIPE_OPEN_X / 2) {
      this._openItem(index);
    } else {
      this._closeItem(index);
    }
  },

  _openItem(index) {
    this.setData({
      [`sessions[${index}].offsetX`]: SWIPE_OPEN_X,
      [`sessions[${index}].transitioning`]: true,
      activeIndex: index
    });
  },

  _closeItem(index) {
    this.setData({
      [`sessions[${index}].offsetX`]: 0,
      [`sessions[${index}].transitioning`]: true,
      activeIndex: -1
    });
  },

  // ===== 置顶 =====
  onPin(e) {
    const { index, sessionid, pinned } = e.currentTarget.dataset;
    const pinnedIds = wx.getStorageSync('pinnedSessions') || [];
    let newPinnedIds;

    if (pinned) {
      newPinnedIds = pinnedIds.filter(id => id !== sessionid);
    } else {
      newPinnedIds = [...pinnedIds, sessionid];
    }

    wx.setStorageSync('pinnedSessions', newPinnedIds);
    this._closeItem(index);
    this.loadSessions();
  },

  // ===== 删除 =====
  onDeleteSession(e) {
    const { index, sessionid } = e.currentTarget.dataset;
    this._closeItem(index);

    wx.showModal({
      title: '删除对话',
      content: '确定删除这条历史对话？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await wx.cloud.callFunction({
            name: 'chatClear',
            data: { mode: 'session', session_id: sessionid }
          });
          if (result.result.success) {
            // 同步移除置顶记录
            const pinnedIds = wx.getStorageSync('pinnedSessions') || [];
            wx.setStorageSync('pinnedSessions', pinnedIds.filter(id => id !== sessionid));
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadSessions();
          } else {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        } catch (err) {
          console.error('删除失败:', err);
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  // ===== 点击进入 session =====
  onTapSession(e) {
    if (this.data.isSwiping) return;
    if (this.data.activeIndex !== -1) {
      this._closeItem(this.data.activeIndex);
      return;
    }
    const sessionId = e.currentTarget.dataset.sessionid;
    wx.setStorageSync('switchSessionId', sessionId);
    wx.switchTab({ url: '/pages/chat/chat' });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadSessions();
  },

  onClearKeyword() {
    this.setData({ keyword: '' });
    this.loadSessions();
  }
});

function formatDate(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return '今天';
  if (msgDate.getTime() === yesterday.getTime()) return '昨天';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
