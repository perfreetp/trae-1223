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
      let ts;
      const isPublished = n.publishDate && (n.status === 'published' || n.status === 'done');
      if (isPublished) {
        ts = new Date(n.publishDate).getTime();
      } else {
        const created = n.createdAt ? new Date(n.createdAt).getTime() : 0;
        const updated = n.updatedAt ? new Date(n.updatedAt).getTime() : 0;
        ts = Math.max(created, updated);
      }
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
        <div class="theme-row" onclick="openReviewDrawer('theme', '${escapeAttr(t.name)}')">
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
    <div class="cover-item" onclick="openReviewDrawer('note', '${n.id}')">
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

  grid.innerHTML = list.map(t => {
    const useCount = t.useCount || 0;
    let useInfo = `使用 ${useCount} 次`;
    if (t.lastUsedAt && t.useHistory && t.useHistory.length > 0) {
      const d = new Date(t.lastUsedAt);
      const lastUseStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const last = t.useHistory[t.useHistory.length - 1];
      const useType = last.source === 'insert' ? '✏️ 插入' : '📋 复制';
      const srcStr = last.noteTitle ? ` · 来源：${escapeHtml(last.noteTitle.substring(0, 12))}` : '';
      useInfo = `使用 ${useCount} 次 · ${useType}${lastUseStr}${srcStr}`;
    }
    return `
    <div class="template-card">
      <div class="template-icon">${t.icon || '📝'}</div>
      <div class="template-name">${escapeHtml(t.name || '未命名')}</div>
      <span class="template-category">${CATEGORY_LABELS[t.category] || t.category || '未分类'}</span>
      <div class="template-preview" title="${escapeHtml(t.content || '')}">${escapeHtml(t.content || '无内容')}</div>
      <div class="template-footer">
        <span class="template-use-count" title="${escapeHtml(useInfo)}">${useInfo}</span>
        <div class="template-actions">
          <button class="icon-btn" title="编辑" onclick="openTemplateModal('${t.id}')">✏️</button>
          <button class="icon-btn" title="复制" onclick="copyTemplateContent('${t.id}')">📋</button>
          <button class="icon-btn" title="应用模板" onclick="applyTemplate('${t.id}')">✨</button>
          <button class="icon-btn danger" title="删除" onclick="deleteTemplate('${t.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `;}).join('');
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
  const content = template.content || '';
  const hasEditor = (typeof currentSelectedNoteId !== 'undefined') && currentSelectedNoteId && document.getElementById('editor-content');

  function recordUse(source) {
    list[idx].useCount = (list[idx].useCount || 0) + 1;
    list[idx].lastUsedAt = Date.now();
    if (!list[idx].useHistory) list[idx].useHistory = [];
    let src = { timestamp: Date.now(), source: source || 'clipboard' };
    if (hasEditor && source !== 'clipboard') {
      const notes = getNotes();
      const note = notes.find(n => n.id === currentSelectedNoteId);
      src.noteId = currentSelectedNoteId;
      src.noteTitle = note ? (note.title || '未命名笔记') : '';
    }
    list[idx].useHistory.push(src);
    list[idx].updatedAt = Date.now();
    saveTemplates(list);
    filterTemplates();
  }

  if (!hasEditor) {
    const ta = document.createElement('textarea');
    ta.value = content;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      recordUse('clipboard');
      showToast(`✨ 模板「${template.name}」已复制到剪贴板`, 'success');
    } catch (e) {
      showToast('复制失败，请手动复制', 'error');
    }
    document.body.removeChild(ta);
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;animation:fadeIn 0.2s ease;';
  overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;animation:fadeIn 0.25s ease;">
      <div class="modal-header">
        <h3 style="margin:0;">应用模板「${escapeHtml(template.name || '')}」</h3>
        <button class="modal-close" style="font-size:24px;background:none;border:none;cursor:pointer;">×</button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <p style="margin:0 0 16px;color:var(--text-secondary);">选择应用方式：</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button id="opt-insert" class="btn-primary" style="width:100%;padding:14px;border:none;border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;gap:10px;text-align:left;">
            <span style="font-size:22px;">✏️</span>
            <span>
              <strong>插入到当前笔记正文</strong>
              <div style="font-size:12px;color:var(--text-secondary);font-weight:400;margin-top:2px;">自动记录使用次数与来源笔记</div>
            </span>
          </button>
          <button id="opt-copy" class="btn-secondary" style="width:100%;padding:14px;border:1px solid var(--border-dark);background:var(--bg-primary);border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;gap:10px;text-align:left;">
            <span style="font-size:22px;">📋</span>
            <span>
              <strong>复制到剪贴板</strong>
              <div style="font-size:12px;color:var(--text-secondary);font-weight:400;margin-top:2px;">可手动粘贴到任何位置</div>
            </span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').onclick = () => document.body.removeChild(overlay);
  overlay.querySelector('#opt-insert').onclick = () => {
    const ok = insertTemplateIntoEditor(template.id, content, template.name);
    if (ok) { recordUse('insert'); }
    document.body.removeChild(overlay);
  };
  overlay.querySelector('#opt-copy').onclick = () => {
    const ta = document.createElement('textarea');
    ta.value = content;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      recordUse('clipboard');
      showToast(`✨ 模板「${template.name}」已复制到剪贴板`, 'success');
    } catch (e) {
      showToast('复制失败，请手动复制', 'error');
    }
    document.body.removeChild(ta);
    document.body.removeChild(overlay);
  };
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

let currentDrawerContext = null;

function openReviewDrawer(type, id) {
  const overlay = document.getElementById('review-drawer-overlay');
  const drawer = document.getElementById('review-drawer');
  const titleEl = document.getElementById('drawer-title');
  const bodyEl = document.getElementById('drawer-body');
  const allNotes = getFilteredNotes();
  const templates = getTemplates();

  if (type === 'theme') {
    const themeName = id;
    const themeNotes = allNotes.filter(n => n.themeName === themeName);
    const likes = themeNotes.reduce((s, n) => s + (n.likes || 0), 0);
    const favs = themeNotes.reduce((s, n) => s + (n.favorites || 0), 0);
    const cmts = themeNotes.reduce((s, n) => s + (n.comments || 0), 0);
    const topNote = themeNotes.length > 0 ? themeNotes.reduce((m, n) => ((n.likes || 0) + (n.favorites || 0) * 2) > ((m.likes || 0) + (m.favorites || 0) * 2) ? n : m, themeNotes[0]) : null;
    const usedTemplateIds = new Set();
    themeNotes.forEach(n => {
      const tplId = n.appliedTemplateId || (n.usedTemplateIds && n.usedTemplateIds[0]);
      if (tplId) usedTemplateIds.add(tplId);
    });
    const usedTemplates = templates.filter(t => usedTemplateIds.has(t.id));
    const sortedNotes = [...themeNotes].sort((a, b) =>
      ((b.likes || 0) + (b.favorites || 0) * 2 + (b.comments || 0)) -
      ((a.likes || 0) + (a.favorites || 0) * 2 + (a.comments || 0))
    );
    currentDrawerContext = { type, themeName, notes: themeNotes, sortedNotes: sortedNotes, currentSort: 'composite', summary: { totalNotes: themeNotes.length, totalLikes: likes, totalFavorites: favs, totalComments: cmts }, topNote, usedTemplates };

    titleEl.textContent = `${themeName} - 主题详情`;
    bodyEl.innerHTML = `
      ${topNote?.cover ? `
      <div class="drawer-section">
        <div class="drawer-section-title">🏆 最佳封面</div>
        <div class="drawer-cover-preview"><img src="${topNote.cover}" alt=""></div>
        <div style="font-weight:600;font-size:14px;">${escapeHtml(topNote.title || '')}</div>
      </div>` : ''}
      <div class="drawer-section">
        <div class="drawer-section-title">📊 主题表现汇总</div>
        <div class="drawer-stat-grid">
          <div class="drawer-stat-item"><div class="drawer-stat-value">${themeNotes.length}</div><div class="drawer-stat-label">笔记数</div></div>
          <div class="drawer-stat-item"><div class="drawer-stat-value">${formatNumber(likes)}</div><div class="drawer-stat-label">总点赞</div></div>
          <div class="drawer-stat-item"><div class="drawer-stat-value">${formatNumber(favs)}</div><div class="drawer-stat-label">总收藏</div></div>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:var(--text-secondary);">总评论数：</span>
          <strong style="color:var(--primary-color);">${formatNumber(cmts)}</strong>
        </div>
        <div style="margin-top:4px;display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:var(--text-secondary);">平均互动：</span>
          <strong>${themeNotes.length > 0 ? formatNumber(Math.round((likes + favs * 2 + cmts) / themeNotes.length)) : 0}</strong>
        </div>
      </div>
      <div class="drawer-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div class="drawer-section-title" style="margin:0;">📝 关联笔记 (${themeNotes.length})</div>
          <select id="drawer-sort" class="form-select" style="width:140px;padding:4px 8px;font-size:12px;" onchange="sortDrawerNotes(this.value)">
            <option value="composite">综合排序</option>
            <option value="likes">按点赞↓</option>
            <option value="favorites">按收藏↓</option>
            <option value="comments">按评论↓</option>
            <option value="date">按时间↓</option>
          </select>
        </div>
        <div id="drawer-notes-list">
          ${renderDrawerNotesList(sortedNotes)}
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">🎨 使用过的模板 (${usedTemplates.length})</div>
        ${usedTemplates.map(t => `
          <div class="drawer-template-item">
            <span class="drawer-template-icon">${t.icon || '📝'}</span>
            <div class="drawer-template-info">
              <div class="drawer-template-name">${escapeHtml(t.name || '')}</div>
              <div class="drawer-template-meta">${CATEGORY_LABELS[t.category] || t.category || '未分类'} · 使用 ${t.useCount || 0} 次${t.lastUsedAt ? ' · 最近 ' + formatDateStr(new Date(t.lastUsedAt)) : ''}</div>
            </div>
          </div>
        `).join('') || '<div style="font-size:12px;color:var(--text-tertiary);">暂无模板记录（应用模板后会出现在这里）</div>'}
      </div>
    `;
  } else if (type === 'note') {
    const note = allNotes.find(n => n.id === id);
    if (!note) { closeReviewDrawer(); showToast('笔记不存在', 'error'); return; }
    const usedTemplates = templates.filter(t => t.id === note.appliedTemplateId || (note.usedTemplateIds || []).includes(t.id));
    currentDrawerContext = { type, note, usedTemplates };

    titleEl.textContent = note.title || '笔记详情';
    bodyEl.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">🖼️ 笔记封面</div>
        <div class="drawer-cover-preview">
          ${note.cover ? `<img src="${note.cover}" alt="">` : '<div style="font-size:48px;opacity:0.4;">🖼️</div>'}
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">📈 数据表现</div>
        <div class="drawer-stat-grid">
          <div class="drawer-stat-item"><div class="drawer-stat-value">${formatNumber(note.likes || 0)}</div><div class="drawer-stat-label">点赞</div></div>
          <div class="drawer-stat-item"><div class="drawer-stat-value">${formatNumber(note.favorites || 0)}</div><div class="drawer-stat-label">收藏</div></div>
          <div class="drawer-stat-item"><div class="drawer-stat-value">${formatNumber(note.comments || 0)}</div><div class="drawer-stat-label">评论</div></div>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:var(--text-secondary);">综合分：</span>
          <strong style="color:var(--primary-color);">${formatNumber((note.likes || 0) + (note.favorites || 0) * 2)}</strong>
        </div>
        <div style="margin-top:4px;display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:var(--text-secondary);">主题：</span>
          <strong>${note.themeName || '未分类'}</strong>
        </div>
        <div style="margin-top:4px;display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:var(--text-secondary);">发布时间：</span>
          <strong>${note.publishDate ? note.publishDate.substring(0, 10) : (note.createdAt ? note.createdAt.substring(0, 10) : '未发布')}</strong>
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">📝 笔记详情</div>
        <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-sm);">
          <div style="font-weight:600;margin-bottom:8px;">${escapeHtml(note.title || '无标题')}</div>
          <div style="font-size:12px;color:var(--text-secondary);white-space:pre-wrap;max-height:180px;overflow-y:auto;">${escapeHtml(note.content || '（暂无正文内容）')}</div>
        </div>
        ${note.tags && note.tags.length > 0 ? `
          <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">
            ${note.tags.map(t => `<span class="keyword-tag">#${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">🎨 应用过的模板 (${usedTemplates.length})</div>
        ${usedTemplates.map(t => `
          <div class="drawer-template-item">
            <span class="drawer-template-icon">${t.icon || '📝'}</span>
            <div class="drawer-template-info">
              <div class="drawer-template-name">${escapeHtml(t.name || '')}</div>
              <div class="drawer-template-meta">${CATEGORY_LABELS[t.category] || t.category || '未分类'} · 使用 ${t.useCount || 0} 次 · ${t.lastUsedAt ? formatDateTimeStr(new Date(t.lastUsedAt).toISOString()) : ''}</div>
            </div>
          </div>
        `).join('') || '<div style="font-size:12px;color:var(--text-tertiary);">未应用过模板</div>'}
      </div>
    `;
  }

  overlay.classList.add('active');
  drawer.classList.add('active');
}

function closeReviewDrawer() {
  const overlay = document.getElementById('review-drawer-overlay');
  const drawer = document.getElementById('review-drawer');
  if (overlay) overlay.classList.remove('active');
  if (drawer) drawer.classList.remove('active');
  currentDrawerContext = null;
}

function renderDrawerNotesList(notes) {
  if (!notes || notes.length === 0) {
    return '<div style="font-size:12px;color:var(--text-tertiary);">暂无笔记</div>';
  }
  return notes.map(n => `
    <div class="drawer-note-item" onclick="openReviewDrawer('note', '${n.id}')" style="cursor:pointer;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        ${n.cover ? `<div style="width:56px;height:72px;flex-shrink:0;border-radius:6px;overflow:hidden;background:var(--bg-tertiary);"><img src="${n.cover}" style="width:100%;height:100%;object-fit:cover;"></div>` : ''}
        <div style="flex:1;min-width:0;">
          <div class="drawer-note-title">${escapeHtml(n.title || '无标题')}</div>
          <div class="drawer-note-meta">
            <span>❤️ ${formatNumber(n.likes || 0)}</span>
            <span>⭐ ${formatNumber(n.favorites || 0)}</span>
            <span>💬 ${formatNumber(n.comments || 0)}</span>
            <span>📅 ${n.publishDate ? n.publishDate.substring(0, 10) : (n.createdAt ? n.createdAt.substring(0, 10) : '')}</span>
          </div>
          ${n.appliedTemplateId ? `<div style="margin-top:4px;font-size:11px;color:var(--text-secondary);">🎨 使用模板</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function sortDrawerNotes(sortBy) {
  if (!currentDrawerContext || currentDrawerContext.type !== 'theme') return;
  const { notes } = currentDrawerContext;
  let sorted = [...notes];
  switch (sortBy) {
    case 'likes':
      sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      break;
    case 'favorites':
      sorted.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));
      break;
    case 'comments':
      sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0));
      break;
    case 'date':
      sorted.sort((a, b) => {
        const ta = a.publishDate ? new Date(a.publishDate).getTime() : new Date(a.createdAt || 0).getTime();
        const tb = b.publishDate ? new Date(b.publishDate).getTime() : new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
      break;
    case 'composite':
    default:
      sorted.sort((a, b) =>
        ((b.likes || 0) + (b.favorites || 0) * 2 + (b.comments || 0)) -
        ((a.likes || 0) + (a.favorites || 0) * 2 + (a.comments || 0))
      );
  }
  currentDrawerContext.sortedNotes = sorted;
  currentDrawerContext.currentSort = sortBy;
  const listEl = document.getElementById('drawer-notes-list');
  if (listEl) listEl.innerHTML = renderDrawerNotesList(sorted);
}

function exportDrawerData() {
  if (!currentDrawerContext) { showToast('暂无数据可导出', 'info'); return; }
  const { type } = currentDrawerContext;
  const allInteractions = StorageManager.getInteractions();
  const allTemplates = StorageManager.getTemplates();
  let exportData = {};
  if (type === 'theme') {
    const { themeName, notes, summary, usedTemplates, topNote, currentSort, sortedNotes } = currentDrawerContext;
    const relatedNoteIds = new Set(notes.map(n => n.id));
    const relatedInteractions = allInteractions.filter(i => i.noteId && relatedNoteIds.has(i.noteId));
    const interactionsByType = {
      comments: relatedInteractions.filter(i => i.type === 'comment').length,
      dms: relatedInteractions.filter(i => i.type === 'dm').length,
      questions: relatedInteractions.filter(i => i.type === 'question').length,
      todos: relatedInteractions.filter(i => i.type === 'todo').length
    };
    const pendingTodos = relatedInteractions.filter(i => i.type === 'todo' && !i.completed);
    exportData = {
      exportType: 'theme-review-full',
      themeName,
      exportedAt: new Date().toISOString(),
      currentSort: currentSort || 'composite',
      summary: {
        noteCount: notes.length,
        totalLikes: summary.totalLikes || summary.likes || 0,
        totalFavorites: summary.totalFavorites || summary.favs || 0,
        totalComments: summary.totalComments || summary.cmts || 0,
        avgInteraction: notes.length > 0 ? Math.round(((summary.totalLikes || summary.likes || 0) + (summary.totalFavorites || summary.favs || 0) * 2 + (summary.totalComments || summary.cmts || 0)) / notes.length) : 0
      },
      interactionsSummary: {
        total: relatedInteractions.length,
        byType: interactionsByType,
        pendingTodosCount: pendingTodos.length
      },
      topPerformingNote: topNote ? {
        id: topNote.id,
        title: topNote.title,
        cover: topNote.cover ? topNote.cover : null,
        coverPreview: topNote.cover ? 'base64封面已包含' : '无封面',
        likes: topNote.likes || 0,
        favorites: topNote.favorites || 0,
        comments: topNote.comments || 0,
        publishDate: topNote.publishDate || topNote.createdAt || '',
        status: topNote.status || 'draft',
        content: topNote.content ? topNote.content.substring(0, 1000) : ''
      } : null,
      covers: sortedNotes
        .filter(n => n.cover)
        .map(n => ({
          noteId: n.id,
          noteTitle: n.title,
          cover: n.cover,
          compositeScore: (n.likes || 0) + (n.favorites || 0) * 2,
          likes: n.likes || 0,
          favorites: n.favorites || 0,
          comments: n.comments || 0
        })),
      notes: (sortedNotes || notes).map(n => ({
        id: n.id,
        title: n.title,
        theme: n.themeName,
        likes: n.likes || 0,
        favorites: n.favorites || 0,
        comments: n.comments || 0,
        publishDate: n.publishDate || n.createdAt || '',
        status: n.status || 'draft',
        cover: n.cover ? n.cover : null,
        tags: n.tags || [],
        appliedTemplateId: n.appliedTemplateId || null,
        usedTemplateIds: n.usedTemplateIds || [],
        content: n.content ? n.content.substring(0, 2000) : ''
      })),
      usedTemplates: usedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        category: CATEGORY_LABELS[t.category] || t.category,
        useCount: t.useCount || 0,
        icon: t.icon,
        lastUsedAt: t.lastUsedAt || null,
        useHistory: (t.useHistory || []).slice(-10),
        remark: t.remark || '',
        content: t.content || ''
      })),
      relatedInteractions: relatedInteractions.slice(0, 200),
      pendingTodos
    };
  } else if (type === 'note') {
    const { note, usedTemplates } = currentDrawerContext;
    const relatedInteractions = allInteractions.filter(i => i.noteId === note.id);
    exportData = {
      exportType: 'note-review-full',
      exportedAt: new Date().toISOString(),
      note: {
        id: note.id,
        title: note.title,
        theme: note.themeName,
        likes: note.likes || 0,
        favorites: note.favorites || 0,
        comments: note.comments || 0,
        publishDate: note.publishDate || note.createdAt || '',
        updatedAt: note.updatedAt || '',
        status: note.status || 'draft',
        cover: note.cover ? note.cover : null,
        tags: note.tags || [],
        appliedTemplateId: note.appliedTemplateId || null,
        usedTemplateIds: note.usedTemplateIds || [],
        imagesCount: (note.images || []).length,
        content: note.content || ''
      },
      appliedTemplates: usedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        category: CATEGORY_LABELS[t.category] || t.category,
        useCount: t.useCount || 0,
        lastUsedAt: t.lastUsedAt || null,
        useHistory: (t.useHistory || []).filter(h => h.noteId === note.id),
        content: t.content || ''
      })),
      relatedInteractions: relatedInteractions,
      compositeScore: (note.likes || 0) + (note.favorites || 0) * 2
    };
  }
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fn = type === 'theme'
    ? `完整主题复盘_${currentDrawerContext.themeName}_${formatDateInput(new Date())}.json`
    : `完整笔记复盘_${currentDrawerContext.note?.title?.substring(0, 15) || 'note'}_${formatDateInput(new Date())}.json`;
  a.download = fn.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`完整数据已导出（${type === 'theme' ? exportData.notes.length + '篇笔记+封面+模板+互动' : '笔记+封面+模板+互动'}）`, 'success');
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
