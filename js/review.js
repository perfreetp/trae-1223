const CATEGORY_OPTIONS = [
  { value: 'topic', label: '选题' },
  { value: 'title', label: '标题' },
  { value: 'content', label: '正文' },
  { value: 'cover', label: '封面' },
  { value: 'structure', label: '结构' }
];

const CATEGORY_LABELS = {
  topic: '选题',
  title: '标题',
  content: '正文',
  cover: '封面',
  structure: '结构'
};

const EMOJI_OPTIONS = [
  '📝','✨','🔥','💡','🎨','📊','❤️','⭐','🎯','🚀',
  '💼','🏆','🌟','💪','📌','🎭','📖','✏️','🎪','🌈',
  '🎀','🎁','🎈','🍀','🌸','🌺','🎵','📷','💎','🎊'
];

function getTemplates() {
  return StorageManager.getTemplates();
}

function saveTemplates(list) {
  StorageManager.set('templates', list);
}

function getNotesForReview() {
  const topics = StorageManager.getTopics();
  const notes = StorageManager.getNotes();
  return { topics, notes };
}

function getFilteredNotes() {
  const period = document.getElementById('review-period')?.value || 'all';
  const themeFilter = document.getElementById('review-theme-filter')?.value || 'all';
  const { topics, notes } = getNotesForReview();

  const topicMap = {};
  topics.forEach(t => { topicMap[t.id] = t; });

  let filteredNotes = notes.map(n => ({
    ...n,
    topic: topicMap[n.topicId] || null,
    themeName: topicMap[n.topicId]?.theme || topicMap[n.topicId]?.title || '未分类'
  }));

  if (themeFilter !== 'all') {
    filteredNotes = filteredNotes.filter(n => n.themeName === themeFilter);
  }

  if (period !== 'all') {
    const days = parseInt(period);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    filteredNotes = filteredNotes.filter(n => {
      const ts = n.publishDate ? new Date(n.publishDate).getTime() : (n.createdAt || 0);
      return ts >= cutoff;
    });
  }

  return filteredNotes;
}

function renderReview() {
  renderTemplateFilters();
  renderThemePerformance();
  renderTopCovers();
  filterTemplates();
}

function renderTemplateFilters() {
  const { topics } = getNotesForReview();
  const themes = [...new Set(topics.map(t => t.theme || t.title).filter(Boolean))];
  const select = document.getElementById('review-theme-filter');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="all">全部主题</option>` + 
    themes.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  select.value = currentVal || 'all';
}

function renderThemePerformance() {
  const container = document.getElementById('theme-performance');
  if (!container) return;

  const notes = getFilteredNotes();

  const themeMap = {};
  notes.forEach(n => {
    const theme = n.themeName || '未分类';
    if (!themeMap[theme]) {
      themeMap[theme] = { count: 0, likes: 0, favorites: 0, comments: 0 };
    }
    themeMap[theme].count++;
    themeMap[theme].likes += n.likes || 0;
    themeMap[theme].favorites += n.favorites || 0;
    themeMap[theme].comments += n.comments || 0;
  });

  const themes = Object.entries(themeMap).map(([name, data]) => ({
    name,
    ...data,
    avgInteraction: data.count > 0 
      ? Math.round((data.likes + data.favorites * 2 + data.comments) / data.count)
      : 0
  }));

  const maxInteraction = Math.max(...themes.map(t => t.avgInteraction), 1);

  themes.sort((a, b) => b.avgInteraction - a.avgInteraction);

  if (themes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="height:200px;">
        <div class="empty-icon">📈</div>
        <h3>暂无数据</h3>
        <p>在所选时间范围内没有笔记数据</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="theme-row header">
      <div>主题名称</div>
      <div>互动表现</div>
      <div class="theme-stat-label">笔记数</div>
      <div class="theme-stat-label">总点赞</div>
      <div class="theme-stat-label">总收藏</div>
      <div class="theme-stat-label">平均互动</div>
    </div>
    ${themes.map(t => {
      const pct = Math.round((t.avgInteraction / maxInteraction) * 100);
      return `
        <div class="theme-row">
          <div class="theme-name">${escapeHtml(t.name)}</div>
          <div>
            <div class="theme-bar">
              <div class="theme-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="theme-stat">${t.count}</div>
          <div class="theme-stat">${formatNumber(t.likes)}</div>
          <div class="theme-stat">${formatNumber(t.favorites)}</div>
          <div class="theme-stat" style="color:var(--primary-color);">${formatNumber(t.avgInteraction)}</div>
        </div>
      `;
    }).join('')}
  `;
}

function renderTopCovers() {
  const container = document.getElementById('top-covers');
  if (!container) return;

  const notes = getFilteredNotes();

  const scored = notes.map(n => ({
    ...n,
    score: (n.likes || 0) + (n.favorites || 0) * 2
  })).filter(n => n.score > 0 || n.cover || n.title);

  scored.sort((a, b) => b.score - a.score);
  const top10 = scored.slice(0, 10);

  if (top10.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="height:200px;">
        <div class="empty-icon">🖼️</div>
        <h3>暂无数据</h3>
        <p>在所选时间范围内没有笔记数据</p>
      </div>
    `;
    return;
  }

  container.innerHTML = top10.map((n, i) => `
    <div class="cover-item">
      <div class="cover-rank">${i + 1}</div>
      <div class="cover-image">
        ${n.cover 
          ? `<img src="${n.cover}" alt="">`
          : `<div class="cover-placeholder">🖼️</div>`
        }
      </div>
      <div class="cover-info">
        <div class="cover-title" title="${escapeHtml(n.title || '')}">${escapeHtml(n.title || '无标题')}</div>
        <div class="cover-score">
          <span>综合分</span>
          <strong>${formatNumber(n.score)}</strong>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTemplates(list) {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📋</div>
        <h3>暂无模板</h3>
        <p>点击"新建模板"开始沉淀可复用内容</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(t => `
    <div class="template-card">
      <div class="template-icon">${t.icon || '📝'}</div>
      <div class="template-name">${escapeHtml(t.name || '未命名')}</div>
      <span class="template-category">${CATEGORY_LABELS[t.category] || t.category || '未分类'}</span>
      <div class="template-preview" title="${escapeHtml(t.content || '')}">${escapeHtml(t.content || '无内容')}</div>
      <div class="template-footer">
        <span class="template-use-count">使用 ${t.useCount || 0} 次</span>
        <div class="template-actions">
          <button class="icon-btn" title="编辑" onclick="openTemplateModal('${t.id}')">✏️</button>
          <button class="icon-btn" title="复制" onclick="copyTemplateContent('${t.id}')">📋</button>
          <button class="icon-btn" title="应用模板" onclick="applyTemplate('${t.id}')">✨</button>
          <button class="icon-btn danger" title="删除" onclick="deleteTemplate('${t.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterTemplates() {
  const keyword = (document.getElementById('template-search')?.value || '').toLowerCase();
  let list = getTemplates();

  if (keyword) {
    list = list.filter(t => 
      (t.name || '').toLowerCase().includes(keyword) ||
      (t.content || '').toLowerCase().includes(keyword) ||
      (CATEGORY_LABELS[t.category] || '').toLowerCase().includes(keyword)
    );
  }

  renderTemplates(list);
}

function openTemplateModal(templateOrId) {
  const list = getTemplates();
  let template = null;
  let isEdit = false;

  if (typeof templateOrId === 'string' && templateOrId) {
    template = list.find(t => t.id === templateOrId);
    isEdit = true;
  } else if (templateOrId && typeof templateOrId === 'object') {
    template = templateOrId;
  }

  const currentIcon = template?.icon || '📝';

  const modalHtml = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>${isEdit ? '编辑模板' : '新建模板'}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="template-id" value="${template?.id || ''}">
          
          <div class="form-group">
            <label class="form-label">选择图标</label>
            <div id="emoji-picker" style="display:flex;flex-wrap:wrap;gap:8px;padding:12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-tertiary);">
              ${EMOJI_OPTIONS.map(e => `
                <span 
                  class="emoji-option" 
                  data-emoji="${e}"
                  onclick="selectTemplateEmoji('${e}')"
                  style="font-size:24px;padding:8px;border-radius:8px;cursor:pointer;transition:all 0.2s;${currentIcon === e ? 'background:var(--primary-color);color:#fff;' : ''}"
                  onmouseover="this.style.background='${currentIcon === e ? '' : 'rgba(254,44,85,0.1)'}';"
                  onmouseout="this.style.background='${currentIcon === e ? 'var(--primary-color)' : 'transparent'}';"
                >${e}</span>
              `).join('')}
            </div>
            <input type="hidden" id="template-icon" value="${currentIcon}">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">模板名称</label>
              <input type="text" class="form-input" id="template-name" placeholder="例如：爆款标题公式" value="${escapeHtml(template?.name || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">分类</label>
              <select class="form-select" id="template-category" style="width:100%;">
                ${CATEGORY_OPTIONS.map(opt => `
                  <option value="${opt.value}" ${template?.category === opt.value ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">模板内容</label>
            <textarea class="form-textarea" id="template-content" rows="8" placeholder="输入模板内容，可使用 {变量} 标记可替换部分...">${escapeHtml(template?.content || '')}</textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" id="template-remark" rows="2" placeholder="使用说明、适用场景等...">${escapeHtml(template?.remark || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="saveTemplateFromModal()">保存</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modalHtml;
}

function selectTemplateEmoji(emoji) {
  document.getElementById('template-icon').value = emoji;
  document.querySelectorAll('.emoji-option').forEach(el => {
    const isSelected = el.dataset.emoji === emoji;
    el.style.background = isSelected ? 'var(--primary-color)' : 'transparent';
    if (isSelected) {
      el.style.color = '#fff';
    }
  });
}

function saveTemplateFromModal() {
  const id = document.getElementById('template-id').value;
  const list = getTemplates();

  const data = {
    id: id || uid(),
    name: document.getElementById('template-name').value.trim(),
    category: document.getElementById('template-category').value,
    icon: document.getElementById('template-icon').value,
    content: document.getElementById('template-content').value,
    remark: document.getElementById('template-remark').value,
    useCount: id ? (list.find(t => t.id === id)?.useCount || 0) : 0,
    updatedAt: Date.now()
  };

  if (!data.name) {
    showToast('请输入模板名称', 'error');
    return;
  }
  if (!data.content.trim()) {
    showToast('请输入模板内容', 'error');
    return;
  }

  const idx = list.findIndex(t => t.id === data.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...data };
  } else {
    data.createdAt = Date.now();
    list.unshift(data);
  }

  saveTemplates(list);
  closeModal();
  filterTemplates();
  showToast(id ? '模板已更新' : '模板已创建', 'success');
}

function deleteTemplate(id) {
  if (!confirm('确定要删除这个模板吗？')) return;
  let list = getTemplates();
  list = list.filter(t => t.id !== id);
  saveTemplates(list);
  filterTemplates();
  showToast('模板已删除', 'success');
}

function copyTemplateContent(id) {
  const list = getTemplates();
  const template = list.find(t => t.id === id);
  if (!template) return;

  const textarea = document.createElement('textarea');
  textarea.value = template.content || '';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    showToast('模板内容已复制到剪贴板', 'success');
  } catch (e) {
    showToast('复制失败，请手动复制', 'error');
  }
  
  document.body.removeChild(textarea);
}

function applyTemplate(id) {
  const list = getTemplates();
  const idx = list.findIndex(t => t.id === id);
  if (idx < 0) return;

  const template = list[idx];
  const textarea = document.createElement('textarea');
  textarea.value = template.content || '';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    list[idx].useCount = (list[idx].useCount || 0) + 1;
    list[idx].updatedAt = Date.now();
    saveTemplates(list);
    filterTemplates();
    showToast(`✨ 模板「${template.name}」已复制到剪贴板`, 'success');
  } catch (e) {
    showToast('复制失败，请手动复制', 'error');
  }
  
  document.body.removeChild(textarea);
}

function exportReviewReport() {
  const period = document.getElementById('review-period')?.value || 'all';
  const themeFilter = document.getElementById('review-theme-filter')?.value || 'all';

  const periodLabels = {
    '7': '最近7天',
    '30': '最近30天',
    '90': '最近90天',
    'all': '全部时间'
  };

  const notes = getFilteredNotes();
  const templates = getTemplates();
  const competitors = getCompetitors();

  const themeMap = {};
  notes.forEach(n => {
    const theme = n.themeName || '未分类';
    if (!themeMap[theme]) {
      themeMap[theme] = { count: 0, likes: 0, favorites: 0, comments: 0 };
    }
    themeMap[theme].count++;
    themeMap[theme].likes += n.likes || 0;
    themeMap[theme].favorites += n.favorites || 0;
    themeMap[theme].comments += n.comments || 0;
  });

  const themePerformance = Object.entries(themeMap).map(([name, data]) => ({
    theme: name,
    noteCount: data.count,
    totalLikes: data.likes,
    totalFavorites: data.favorites,
    totalComments: data.comments,
    avgInteraction: data.count > 0
      ? Math.round((data.likes + data.favorites * 2 + data.comments) / data.count)
      : 0
  }));

  const topCovers = notes.map(n => ({
    id: n.id,
    title: n.title || '',
    cover: n.cover || '',
    likes: n.likes || 0,
    favorites: n.favorites || 0,
    compositeScore: (n.likes || 0) + (n.favorites || 0) * 2
  }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 10);

  const totalNotes = notes.length;
  const totalLikes = notes.reduce((s, n) => s + (n.likes || 0), 0);
  const totalFavorites = notes.reduce((s, n) => s + (n.favorites || 0), 0);
  const totalComments = notes.reduce((s, n) => s + (n.comments || 0), 0);
  const avgInteractionPerNote = totalNotes > 0
    ? Math.round((totalLikes + totalFavorites * 2 + totalComments) / totalNotes)
    : 0;

  const activeCompetitors = competitors.filter(c => c.status !== 'archived');
  const competitorStats = {
    total: competitors.length,
    active: activeCompetitors.length,
    avgLikes: activeCompetitors.length > 0
      ? Math.round(activeCompetitors.reduce((s, c) => s + (c.likes || 0), 0) / activeCompetitors.length)
      : 0,
    avgFavorites: activeCompetitors.length > 0
      ? Math.round(activeCompetitors.reduce((s, c) => s + (c.favorites || 0), 0) / activeCompetitors.length)
      : 0
  };

  const report = {
    reportName: '数据复盘报告',
    generatedAt: new Date().toISOString(),
    filters: {
      period: periodLabels[period] || period,
      theme: themeFilter === 'all' ? '全部主题' : themeFilter
    },
    summary: {
      totalNotes,
      totalLikes,
      totalFavorites,
      totalComments,
      avgInteractionPerNote,
      templateCount: templates.length,
      competitorStats
    },
    themePerformance,
    topCovers,
    templates: templates.map(t => ({
      id: t.id,
      name: t.name,
      category: CATEGORY_LABELS[t.category] || t.category,
      icon: t.icon,
      useCount: t.useCount || 0,
      contentPreview: (t.content || '').substring(0, 200),
      remark: t.remark || ''
    })),
    topCompetitors: activeCompetitors
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        title: c.title || '',
        account: c.account || '',
        likes: c.likes || 0,
        favorites: c.favorites || 0,
        comments: c.comments || 0,
        recordDate: c.recordDate || ''
      }))
  };

  const jsonStr = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `复盘报告_${formatDateInput(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('复盘报告已导出', 'success');
}

if (typeof getCompetitors !== 'function') {
  function getCompetitors() {
    return StorageManager.getCompetitors();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('module-review')) {
    renderReview();
  }
});
