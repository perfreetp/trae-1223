const TOPIC_STATUS = {
  pending: { label: '待创作', class: 'status-pending' },
  draft: { label: '草稿', class: 'status-draft' },
  published: { label: '已发布', class: 'status-published' },
  archived: { label: '已归档', class: 'status-archived' }
};

const TOPIC_CATEGORIES = ['美妆护肤', '穿搭时尚', '美食探店', '旅行攻略', '家居生活', '健身运动', '母婴育儿', '数码测评', '知识科普', '情感心理', '其他'];

let currentFilterKeyword = '';

function getTopics() {
  return StorageManager.getTopics();
}

function setTopics(topics) {
  StorageManager.set('topics', topics);
  updateStorageCount();
}

function renderTopics(topics) {
  const grid = document.getElementById('topics-grid');
  if (!grid) return;

  const keyword = currentFilterKeyword.toLowerCase().trim();
  let filtered = topics || getTopics();

  if (keyword) {
    filtered = filtered.filter(t => {
      const inTitle = t.title && t.title.toLowerCase().includes(keyword);
      const inInspiration = t.inspiration && t.inspiration.toLowerCase().includes(keyword);
      const inKeywords = (t.keywords || []).some(k => k.toLowerCase().includes(keyword));
      const inAudiences = (t.audiences || []).some(a => a.toLowerCase().includes(keyword));
      return inTitle || inInspiration || inKeywords || inAudiences;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
        <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;">💡</div>
        <h3 style="font-size: 16px; color: var(--text-secondary); margin-bottom: 8px;">${keyword ? '没有找到匹配的选题' : '还没有选题'}</h3>
        <p style="font-size: 13px;">${keyword ? '试试其他关键词' : '点击右上角「新建选题」开始收集灵感'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(topic => {
    const score = topic.score || 0;
    let scoreClass = 'score-low';
    if (score >= 8) scoreClass = 'score-high';
    else if (score >= 5) scoreClass = 'score-medium';

    const status = TOPIC_STATUS[topic.status] || TOPIC_STATUS.pending;

    const keywordsHtml = (topic.keywords || []).map(k =>
      `<span class="keyword-tag">#${escapeHtml(k)}</span>`
    ).join('');

    const audiencesHtml = (topic.audiences || []).map(a =>
      `<span class="audience-tag">👥 ${escapeHtml(a)}</span>`
    ).join('');

    return `
      <div class="topic-card" data-id="${topic.id}">
        <div class="topic-card-header">
          <div class="topic-title">${escapeHtml(topic.title || '无标题')}</div>
          <div class="topic-score ${scoreClass}">${score}</div>
        </div>
        ${topic.inspiration ? `<div class="topic-inspiration">${escapeHtml(topic.inspiration)}</div>` : ''}
        ${keywordsHtml ? `<div class="topic-keywords">${keywordsHtml}</div>` : ''}
        ${audiencesHtml ? `<div class="audience-tags">${audiencesHtml}</div>` : ''}
        <div class="topic-card-footer">
          <span class="topic-status ${status.class}">${status.label}</span>
          <div class="topic-actions">
            <button class="icon-btn" onclick="openTopicModal('${topic.id}')" title="编辑">✏️</button>
            <button class="icon-btn danger" onclick="deleteTopic('${topic.id}')" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTopicStats() {
  const topics = getTopics();
  const total = topics.length;
  const highScore = topics.filter(t => (t.score || 0) >= 8).length;
  const pending = topics.filter(t => t.status === 'pending').length;
  const published = topics.filter(t => t.status === 'published').length;

  const totalEl = document.getElementById('stat-total');
  const highEl = document.getElementById('stat-highscore');
  const pendingEl = document.getElementById('stat-pending');
  const publishedEl = document.getElementById('stat-published');

  if (totalEl) totalEl.textContent = total;
  if (highEl) highEl.textContent = highScore;
  if (pendingEl) pendingEl.textContent = pending;
  if (publishedEl) publishedEl.textContent = published;
}

function filterTopics() {
  const input = document.getElementById('topic-search');
  currentFilterKeyword = input ? input.value : '';
  renderTopics(getTopics());
}

function openTopicModal(topicId) {
  const topics = getTopics();
  const isEdit = !!topicId;
  const topic = isEdit ? topics.find(t => t.id === topicId) : null;

  const title = isEdit ? '编辑选题' : '新建选题';
  const data = topic || {
    title: '',
    inspiration: '',
    score: 7,
    keywords: [],
    audiences: [],
    category: TOPIC_CATEGORIES[0],
    status: 'pending'
  };

  const keywordsHtml = (data.keywords || []).map((k, i) => renderTagInputItem(k, 'topic-keyword', i)).join('');
  const audiencesHtml = (data.audiences || []).map((a, i) => renderTagInputItem(a, 'topic-audience', i)).join('');
  const statusOptions = Object.entries(TOPIC_STATUS).map(([key, val]) =>
    `<option value="${key}" ${data.status === key ? 'selected' : ''}>${val.label}</option>`
  ).join('');
  const categoryOptions = TOPIC_CATEGORIES.map(c =>
    `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  const html = `
    <div class="modal-overlay" onclick="closeModalOnBackdrop(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选题标题 <span style="color: var(--danger-color);">*</span></label>
            <input type="text" id="topic-modal-title" class="form-input" placeholder="输入选题标题..." value="${escapeAttr(data.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">灵感描述</label>
            <textarea id="topic-modal-inspiration" class="form-textarea" placeholder="记录灵感、创作方向、参考案例等..." rows="3">${escapeHtml(data.inspiration || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">
              标题分数
              <span class="label-extra" id="score-display">当前: ${data.score} 分</span>
            </label>
            <div style="display: flex; align-items: center; gap: 16px; padding: 8px 0;">
              <input type="range" id="topic-modal-score" min="1" max="10" value="${data.score}" 
                style="flex: 1; accent-color: var(--primary-color);" 
                oninput="document.getElementById('score-display').textContent = '当前: ' + this.value + ' 分'">
              <span style="font-weight: 600; color: var(--primary-color); min-width: 30px;">${data.score}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">关键词标签</label>
            <div class="tags-manager" id="topic-keywords-container">
              ${keywordsHtml}
              <input type="text" class="tag-input" id="topic-keyword-input" placeholder="输入关键词后回车添加..." onkeydown="handleTagInputKeydown(event, 'topic-keywords-container', 'topic-keyword-input', 'topic-keyword')">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">适合人群</label>
            <div class="tags-manager" id="topic-audiences-container">
              ${audiencesHtml}
              <input type="text" class="tag-input" id="topic-audience-input" placeholder="输入人群后回车添加，如：学生党、宝妈..." onkeydown="handleTagInputKeydown(event, 'topic-audiences-container', 'topic-audience-input', 'topic-audience')">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">主题分类</label>
              <select id="topic-modal-category" class="form-select" style="width: 100%;">
                ${categoryOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select id="topic-modal-status" class="form-select" style="width: 100%;">
                ${statusOptions}
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="saveTopicFromModal('${topicId || ''}')">${isEdit ? '保存修改' : '创建选题'}</button>
        </div>
      </div>
    </div>
  `;

  openModal(html);
}

function saveTopicFromModal(topicId) {
  const titleEl = document.getElementById('topic-modal-title');
  const inspirationEl = document.getElementById('topic-modal-inspiration');
  const scoreEl = document.getElementById('topic-modal-score');
  const categoryEl = document.getElementById('topic-modal-category');
  const statusEl = document.getElementById('topic-modal-status');

  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) {
    showToast('请输入选题标题', 'warning');
    titleEl && titleEl.focus();
    return;
  }

  const keywords = collectTagsFromContainer('topic-keywords-container', 'topic-keyword');
  const audiences = collectTagsFromContainer('topic-audiences-container', 'topic-audience');

  const topics = getTopics();
  const now = new Date().toISOString();

  if (topicId) {
    const idx = topics.findIndex(t => t.id === topicId);
    if (idx !== -1) {
      topics[idx] = {
        ...topics[idx],
        title,
        inspiration: inspirationEl ? inspirationEl.value.trim() : '',
        score: scoreEl ? parseInt(scoreEl.value) : 0,
        keywords,
        audiences,
        category: categoryEl ? categoryEl.value : '',
        status: statusEl ? statusEl.value : 'pending',
        updatedAt: now
      };
      showToast('选题已更新', 'success');
    }
  } else {
    const newTopic = {
      id: generateId(),
      title,
      inspiration: inspirationEl ? inspirationEl.value.trim() : '',
      score: scoreEl ? parseInt(scoreEl.value) : 0,
      keywords,
      audiences,
      category: categoryEl ? categoryEl.value : '',
      status: statusEl ? statusEl.value : 'pending',
      createdAt: now,
      updatedAt: now
    };
    topics.unshift(newTopic);
    showToast('选题创建成功', 'success');
  }

  setTopics(topics);
  renderTopicStats();
  renderTopics(topics);
  closeModal();
}

function deleteTopic(id) {
  confirmDialog('确定要删除这个选题吗？此操作无法撤销。', () => {
    const topics = getTopics().filter(t => t.id !== id);
    setTopics(topics);
    renderTopicStats();
    renderTopics(topics);
    showToast('选题已删除', 'info');
  });
}

function renderTagInputItem(text, prefix, index) {
  return `
    <span class="tag-item" data-prefix="${prefix}" data-index="${index}">
      ${escapeHtml(text)}
      <button class="tag-remove" onclick="this.parentElement.remove()">×</button>
    </span>
  `;
}

function handleTagInputKeydown(event, containerId, inputId, prefix) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    const value = input ? input.value.trim().replace(/,$/, '') : '';
    if (value) {
      const count = container.querySelectorAll(`[data-prefix="${prefix}"]`).length;
      const tagHtml = renderTagInputItem(value, prefix, count);
      if (input) {
        const temp = document.createElement('div');
        temp.innerHTML = tagHtml;
        container.insertBefore(temp.firstElementChild, input);
        input.value = '';
      }
    }
  }
}

function collectTagsFromContainer(containerId, prefix) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const tags = [];
  container.querySelectorAll(`[data-prefix="${prefix}"]`).forEach(el => {
    const text = el.textContent.replace('×', '').trim();
    if (text) tags.push(text);
  });
  return tags;
}
