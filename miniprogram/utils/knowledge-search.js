// 知识库检索工具（轻量级，基于关键词匹配）
// 用法：在 chat.js 中引入并使用

let knowledgeCache = null;

// 从云存储下载并解析知识库
async function loadKnowledgeBase() {
  if (knowledgeCache) return knowledgeCache;

  try {
    const downloadResult = await wx.cloud.downloadFile({
      fileID: 'cloud://cloud1-d4g1b3u4cd759b29d.636c-cloud1-d4g1b3u4cd759b29d-1428195732/knowledge_all.md'
    });
    
    const fs = wx.getFileSystemManager();
    const content = fs.readFileSync(downloadResult.tempFilePath, 'utf-8');
    
    // 按章节分割知识库
    const sections = parseKnowledgeSections(content);
    knowledgeCache = sections;
    return sections;
  } catch (err) {
    console.warn('加载知识库失败：', err.message);
    return [];
  }
}

// 解析知识库为章节数组
function parseKnowledgeSections(content) {
  const sections = [];
  const lines = content.split('\n');
  
  let currentSection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测章节标题（## 知识模块）
    if (line.startsWith('## 知识模块')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('##', '').trim(),
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

// 根据关键词检索相关知识（简单版本）
async function searchKnowledge(query) {
  const sections = await loadKnowledgeBase();
  if (sections.length === 0) return '';
  
  // 提取查询关键词（简单分词）
  const keywords = extractKeywords(query);
  
  // 计算每个章节的匹配分数
  const scored = sections.map(section => {
    const score = calculateRelevance(section.content, keywords);
    return { section, score };
  });
  
  // 取前3个最相关的章节
  const topSections = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(item => item.score > 0)
    .map(item => item.section.content);
  
  // 合并相关内容（限制长度）
  let combined = topSections.join('\n---\n');
  if (combined.length > 4000) {
    combined = combined.substring(0, 4000) + '\n...(知识库内容过长，已截断)';
  }
  
  return combined;
}

// 提取关键词（简单实现）
function extractKeywords(text) {
  // 移除标点和常见词
  const stopWords = ['的', '了', '是', '在', '和', '与', '或', '不', '能', '可以', '如何', '什么', '为什么', '怎么'];
  const words = text.split(/[\s,，。.!！?？;；:：、]+/);
  return words
    .filter(w => w.length >= 2 && !stopWords.includes(w))
    .slice(0, 10);
}

// 计算相关性分数
function calculateRelevance(content, keywords) {
  let score = 0;
  const lowerContent = content.toLowerCase();
  
  keywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    const count = (lowerContent.match(new RegExp(lowerKeyword, 'g')) || []).length;
    score += count;
  });
  
  return score;
}

module.exports = {
  searchKnowledge,
  loadKnowledgeBase
};
