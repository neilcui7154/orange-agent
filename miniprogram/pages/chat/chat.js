const { md2html } = require('../../utils/md-parse');

Page({
  data: {
    messages: [],
    inputText: '',
    isLoading: false,
    isAiTyping: false,
    scrollToView: '',
    sessionId: '',
    showLongTip: false,
    isViewingHistory: false,
    latestSessionId: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.phone) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    let sessionId = wx.getStorageSync('currentSessionId');
    if (!sessionId) {
      sessionId = Date.now().toString();
      wx.setStorageSync('currentSessionId', sessionId);
    }
    this.setData({ sessionId, latestSessionId: sessionId });
    this.loadHistory(sessionId);
  },

  onShow() {
    const switchSessionId = wx.getStorageSync('switchSessionId');
    if (switchSessionId) {
      wx.removeStorageSync('switchSessionId');
      const currentSessionId = wx.getStorageSync('currentSessionId') || this.data.latestSessionId;
      const isViewingHistory = switchSessionId !== currentSessionId;
      if (switchSessionId !== this.data.sessionId) {
        this.setData({ sessionId: switchSessionId, messages: [], showLongTip: false, isViewingHistory });
        this.loadHistory(switchSessionId);
      } else {
        this.setData({ isViewingHistory });
      }
      return;
    }
    const needRefresh = wx.getStorageSync('needRefreshChat');
    if (needRefresh) {
      wx.removeStorageSync('needRefreshChat');
      const sessionId = wx.getStorageSync('currentSessionId');
      this.setData({ messages: [], sessionId, isViewingHistory: false });
      this.loadHistory(sessionId);
    }
  },

  async loadHistory(sessionId) {
    console.log('[loadHistory] sessionId=', sessionId);
    try {
      const db = wx.cloud.database();
      const res = await db.collection('chats')
        .where({ session_id: sessionId })
        .orderBy('created_at', 'asc')
        .limit(50)
        .get();

      const messages = res.data.map((item, idx) => ({
        id: item._id || idx,
        role: item.role,
        content: item.content,
        html: item.role === 'assistant' ? md2html(item.content) : null,
        options: []
      }));
      this.setData({
        messages,
        showLongTip: messages.length >= 20
      });
      if (messages.length > 0) this.scrollToBottom();
    } catch (err) {
      console.error('[loadHistory] 失败 err=', err.message);
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onBackToLatest() {
    const latestSessionId = this.data.latestSessionId;
    this.setData({ sessionId: latestSessionId, messages: [], showLongTip: false, isViewingHistory: false });
    this.loadHistory(latestSessionId);
  },

  onNewSession() {
    if (this.data.isLoading || this.data.isAiTyping) return;
    if (this.data.messages.length === 0) {
      wx.showToast({ title: '当前对话为空', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '新建对话',
      content: '当前对话将归档到历史记录，确定新建？',
      confirmText: '新建',
      confirmColor: '#FF6B00',
      success: (res) => {
        if (res.confirm) this._doNewSession();
      }
    });
  },

  async _doNewSession() {
    wx.showLoading({ title: '归档中...' });
    const oldSessionId = this.data.sessionId;
    // 先生成新 session ID，不依赖云函数返回（云函数只负责生成标题）
    const newSessionId = Date.now().toString();
    wx.setStorageSync('currentSessionId', newSessionId);
    this.setData({
      sessionId: newSessionId,
      latestSessionId: newSessionId,
      messages: [],
      showLongTip: false,
      isViewingHistory: false
    });
    wx.hideLoading();
    // 异步生成旧 session 标题，失败不影响归档
    if (oldSessionId) {
      wx.cloud.callFunction({
        name: 'newSession',
        data: { oldSessionId }
      }).catch(err => console.warn('标题生成失败:', err.message));
    }
  },

  async onSend() {
    const text = this.data.inputText.trim();
    if (!text || this.data.isLoading || this.data.isAiTyping) return;

    const userMsgId = Date.now();
    const userMsg = { id: userMsgId, role: 'user', content: text };

    this.setData({
      messages: this.data.messages.concat([userMsg]),
      inputText: '',
      isLoading: true,
      isAiTyping: true
    });
    this.scrollToBottom();

    console.log('[chatSend] sessionId=', this.data.sessionId, 'msg=', text.substring(0, 20));
    try {
      const result = await wx.cloud.callFunction({
        name: 'chatSend',
        data: { message: text, session_id: this.data.sessionId }
      });

      if (!result.result.success) {
        throw new Error(result.result.message || 'AI 调用失败');
      }

      const fullText = result.result.data.reply;
      const options = result.result.data.options || [];

      const aiMsgId = Date.now() + 1;
      const newMessages = this.data.messages.concat([{ id: aiMsgId, role: 'assistant', content: '', html: null, options: [] }]);
      const showLongTip = newMessages.length >= 20;
      this.setData({ messages: newMessages, isLoading: false, showLongTip });
      this.scrollToBottom();

      this._typeWriter(aiMsgId, fullText, 0, options);

    } catch (err) {
      console.error('[chatSend] 发送失败 err.message=', err.message, 'err=', err);
      wx.showToast({ title: err.message || '发送失败，请重试', icon: 'none' });
      this.setData({
        isLoading: false,
        isAiTyping: false,
        messages: this.data.messages.filter(m => m.id !== userMsgId)
      });
    }
  },

  _typeWriter(msgId, fullText, idx, options) {
    if (!fullText || typeof fullText !== 'string') {
      const messages = this.data.messages.map(m =>
        m.id === msgId ? { ...m, content: fullText || '(回复内容为空)', html: null, options: options || [] } : m
      );
      this.setData({ messages, isAiTyping: false });
      return;
    }

    if (idx >= fullText.length) {
      let html = null;
      try { html = md2html(fullText); } catch (e) {}
      const messages = this.data.messages.map(m =>
        m.id === msgId ? { ...m, html, content: fullText, options: options || [] } : m
      );
      this.setData({ messages, isAiTyping: false });
      return;
    }

    const chunkSize = Math.min(5, fullText.length - idx);
    const newIdx = idx + chunkSize;
    const displayText = fullText.substring(0, newIdx);
    const messages = this.data.messages.map(m =>
      m.id === msgId ? { ...m, content: displayText } : m
    );
    this.setData({ messages });
    if (newIdx % 15 === 0 || newIdx >= fullText.length) this.scrollToBottom();
    setTimeout(() => this._typeWriter(msgId, fullText, newIdx, options), 50);
  },

  scrollToBottom() {
    const len = this.data.messages.length;
    if (len > 0) {
      this.setData({ scrollToView: 'msg-' + (len - 1) });
    }
  },

  async onFavorite(e) {
    const msgId = e.currentTarget.dataset.id;
    const msg = this.data.messages.find(m => m.id === msgId);
    if (!msg) { wx.showToast({ title: '消息不存在', icon: 'none' }); return; }

    try {
      const res = await wx.cloud.callFunction({
        name: 'userFavorites',
        data: { action: 'add', data: { chat_id: msgId, content: msg.content } }
      });
      wx.showToast({
        title: res.result.success ? '收藏成功' : (res.result.message || '收藏失败'),
        icon: res.result.success ? 'success' : 'none'
      });
    } catch (err) {
      console.error('收藏失败:', err);
      wx.showToast({ title: '收藏失败，请重试', icon: 'none' });
    }
  },

  onOptionTap(e) {
    const text = e.currentTarget.dataset.text;
    const msgId = e.currentTarget.dataset.msgid;
    const messages = this.data.messages.map(m =>
      m.id === msgId ? { ...m, options: [] } : m
    );
    this.setData({ messages, inputText: text });
    this.onSend();
  },

  onCloseLongTip() {
    this.setData({ showLongTip: false });
  },

  onShare() {
    wx.showToast({ title: '分享功能开发中', icon: 'none' });
  }
});
