/**
 * 简易 Markdown 转 HTML（用于 rich-text 组件）
 * 支持：标题、加粗、斜体、删除线、链接、代码块、行内代码、引用、有序/无序列表、表格、分隔线
 * 注意：rich-text 只支持 px 单位，不支持 rpx
 */

function md2html(md) {
  if (!md) return '';
  let html = md;

  // ===== 1. 代码块（最先处理，避免内部被误替换）=====
  const codeBlocks = [];
  let blockIdx = 0;
  html = html.replace(/```[\s\S]*?```/g, (m) => {
    const key = `__CODEBLOCK_${blockIdx}__`;
    var code = m.slice(m.indexOf('\n') + 1, m.lastIndexOf('```')).replace(/^\n/, '');
    codeBlocks.push('<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow:auto;font-size:12px;line-height:1.6;margin:8px 0;white-space:pre-wrap;word-break:break-all;">' + escapeHtml(code) + '</pre>');
    blockIdx++;
    return key;
  });

  // ===== 2. 表格 =====
  html = html.replace(/^(\|.+\|)\n(\|[\s\-|:]+\|)\n((\|.+\|\n?)+)/gm, function(_, head, __, body) {
    var headers = head.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return c.trim(); });
    var rows = body.trim().split('\n').map(function(r) { return r.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return c.trim(); }); });
    var t = '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;word-break:break-all;">';
    t += '<tr>' + headers.map(function(h) { return '<th style="border:1px solid #e0e0e0;padding:6px 8px;background:#fafafa;font-weight:600;text-align:left;">' + h + '</th>'; }).join('') + '</tr>';
    rows.forEach(function(r) {
      t += '<tr>' + r.map(function(c) { return '<td style="border:1px solid #e0e0e0;padding:6px 8px;">' + c + '</td>'; }).join('') + '</tr>';
    });
    t += '</table>';
    return t;
  });

  // ===== 3. 引用块 =====
  html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote style="border-left:4px solid #FF6B00;padding:6px 12px;margin:6px 0;color:#666;background:#FFF9F5;">$1</blockquote>');

  // ===== 4. 标题 =====
  html = html.replace(/^###\s+(.*)$/gm, '<div style="font-size:14px;font-weight:600;margin:10px 0 4px;color:#333;">$1</div>');
  html = html.replace(/^##\s+(.*)$/gm, '<div style="font-size:15px;font-weight:700;margin:12px 0 6px;color:#FF6B00;">$1</div>');
  html = html.replace(/^#\s+(.*)$/gm, '<div style="font-size:17px;font-weight:700;margin:12px 0 8px;color:#FF6B00;">$1</div>');

  // ===== 5. 分隔线 =====
  html = html.replace(/^---$/gm, '<div style="border-top:1px solid #e0e0e0;margin:10px 0;"></div>');

  // ===== 6. 有序列表 =====
  html = html.replace(/^\d+\.\s+(.*)$/gm, function(m) {
    var num = m.match(/^(\d+)/)[1];
    var content = m.replace(/^\d+\.\s+/, '');
    return '<div style="padding-left:16px;margin:2px 0;"><span style="color:#FF6B00;margin-right:6px;font-weight:600;">' + num + '.</span>' + content + '</div>';
  });

  // ===== 7. 无序列表（必须在有序列表之后）=====
  html = html.replace(/^[\*\-]\s+(.*)$/gm, '<div style="padding-left:16px;margin:2px 0;"><span style="color:#FF6B00;margin-right:6px;">•</span>$1</div>');

  // ===== 8. 行内代码（在加粗之前）=====
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:12px;color:#E05A00;">$1</code>');

  // ===== 9. 加粗 =====
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#333;">$1</strong>');

  // ===== 10. 斜体 =====
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // ===== 11. 删除线 =====
  html = html.replace(/~~(.*?)~~/g, '<del style="color:#999;">$1</del>');

  // ===== 12. 链接 =====
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color:#FF6B00;text-decoration:underline;">$1</span>');

  // ===== 13. 还原代码块 =====
  codeBlocks.forEach(function(block, i) {
    html = html.replace('__CODEBLOCK_' + i + '__', block);
  });

  // ===== 14. 段落处理 =====
  html = html.split('\n\n').map(function(para) {
    if (para.match(/^<(div|table|blockquote|pre)/)) return para;
    if (!para.trim()) return '';
    return '<p style="margin:6px 0;line-height:1.7;">' + para + '</p>';
  }).filter(Boolean).join('');

  return html;
}

/** HTML 转义 */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { md2html };
