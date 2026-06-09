const TAB_TO_TYPE = {
  comments: 'comment',
  dms: 'dm',
  questions: 'question',
  todos: 'todo'
};
const TYPE_TO_TAB = {
  comment: 'comments',
  dm: 'dms',
  question: 'questions',
  todo: 'todos'
};

let currentInteractionTab = 'comments';

function switchInteractionTab(tab) {
  currentInteractionTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderInteractionStats();
  renderInteractionContent();
}

function renderInteractionStats() {
  const allInteractions = StorageManager.getInteractions();
  const comments = allInteractions.filter(i => i.type === TAB_TO_TYPE.comments);
  const dms = allInteractions.filter(i => i.type === TAB_TO_TYPE.dms);
  const questions = allInteractions.filter(i => i.type === TAB_TO_TYPE.questions);
  const allTodos = allInteractions.filter(i => i.type === TAB_TO_TYPE.todos);
  const pendingTodos = allTodos.filter(i => !i.completed);
  document.getElementById('stat-comments').textContent = comments.length;
  document.getElementById('stat-dms').textContent = dms.length;
  document.getElementById('stat-questions').textContent = questions.length;
  const pendingEl = document.getElementById('stat-todos-pending');
  const totalEl = document.getElementById('stat-todos-total');
  if (pendingEl) pendingEl.textContent = pendingTodos.length;
  if (totalEl) totalEl.textContent = allTodos.length;
}

function renderInteractionContent() {
  const container = document.getElementById('interaction-content');
  const list = StorageManager.getInteractions();
  const typeKey = TAB_TO_TYPE[currentInteractionTab] || currentInteractionTab;
  const filtered = list.filter(i => i.type === typeKey);
  if (currentInteractionTab === 'comments') {
    renderComments(filtered, container);
  } else if (currentInteractionTab === 'dms') {
    renderDms(filtered, container);
  } else if (currentInteractionTab === 'questions') {
    renderQuestions(filtered, container);
  } else if (currentInteractionTab === 'todos') {
    renderTodos(filtered, container);
  }
}

function getAvatarLetter(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function getNoteTitle(noteId) {
  const note = StorageManager.getNotes().find(n => n.id === noteId);
  return note ? note.title : '未关联';
}

function formatDateTimeStr(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderBaseCard(item, typeText, typeClass) {
  return `
    <div class="interaction-card" data-id="${item.id}">
      <div class="interaction-card-header">
        <div class="interaction-user">
          <div class="user-avatar">${getAvatarLetter(item.username)}</div>
          <div class="user-info">
            <h4>${item.username || '匿名用户'}</h4>
            <p>${formatDateTimeStr(item.createdAt)}</p>
          </div>
        </div>
        <span class="interaction-type-tag ${typeClass}">${typeText}</span>
      </div>
      <div class="interaction-content-text">${escapeHtml(item.content || '')}</div>
      <div class="interaction-card-footer">
        <span class="interaction-note-ref">📝 关联笔记：${getNoteTitle(item.noteId)}</span>
        <div class="interaction-card-actions">
          <button class="btn-sm btn-secondary" onclick="openInteractionModal('${item.type}', '${item.id}')">回复</button>
          <button class="btn-sm btn-secondary" onclick="createTodoFromInteraction('${item.id}')">生成待办</button>
          <button class="btn-sm btn-secondary" style="background:rgba(255,77,79,0.08);color:#CF1322" onclick="deleteInteraction('${item.id}')">删除</button>
        </div>
      </div>
    </div>
  `;
}

function renderComments(list, container) {
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💭</div><h3>暂无评论</h3><p>评论记录会显示在这里</p></div>`;
    return;
  }
  const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  container.innerHTML = `<div class="interaction-list">${sorted.map(i => renderBaseCard(i, '评论', 'type-comment')).join('')}</div>`;
}

function renderDms(list, container) {
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✉️</div><h3>暂无私信</h3><p>私信记录会显示在这里</p></div>`;
    return;
  }
  const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  container.innerHTML = `<div class="interaction-list">${sorted.map(i => renderBaseCard(i, '私信', 'type-dm')).join('')}</div>`;
}

function renderQuestions(list, container) {
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❓</div><h3>暂无收藏问题</h3><p>收藏的用户问题会显示在这里</p></div>`;
    return;
  }
  const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  container.innerHTML = `<div class="interaction-list">${sorted.map(i => renderBaseCard(i, '收藏问题', 'type-question')).join('')}</div>`;
}

function renderTodos(list, container) {
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><h3>暂无待办事项</h3><p>添加待办或从互动记录生成</p></div>`;
    return;
  }
  const priorityMap = { high: { text: '高', cls: 'priority-high' }, medium: { text: '中', cls: 'priority-medium' }, low: { text: '低', cls: 'priority-low' } };
  const sorted = list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] || 1) - (order[b.priority] || 1);
  });
  const total = sorted.length;
  const pendingCount = sorted.filter(t => !t.completed).length;
  const header = `<div style="margin-bottom:14px;padding:12px 16px;border-radius:var(--radius-sm);background:var(--bg-tertiary);display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:13px;font-weight:600;">待办统计</span>
    <span style="font-size:13px;">
      <strong style="color:var(--primary-color);">${pendingCount}</strong><span style="color:var(--text-secondary);"> 待处理</span>
      <span style="color:var(--border-dark);margin:0 6px;">·</span>
      <strong>${total - pendingCount}</strong><span style="color:var(--text-secondary);"> 已完成</span>
      <span style="color:var(--border-dark);margin:0 6px;">·</span>
      共 <strong>${total}</strong> 条
    </span>
  </div>`;
  container.innerHTML = header + `<div class="todo-list">${sorted.map(t => {
    const p = priorityMap[t.priority] || priorityMap.medium;
    const sourceText = t.sourceId ? `📌 来源：${t.sourceType ? (t.sourceType === 'comment' ? '评论' : t.sourceType === 'dm' ? '私信' : '问题') : '互动'}` : '';
    return `
      <div class="todo-item${t.completed ? ' completed' : ''}">
        <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodoStatus('${t.id}', this.checked)">
        <div class="todo-content">
          <div class="todo-title">${escapeHtml(t.content || t.title || '')}</div>
          <div class="todo-meta">
            <span class="todo-priority ${p.cls}">优先级：${p.text}</span>
            ${t.assignee ? `<span>👤 ${escapeHtml(t.assignee)}</span>` : ''}
            ${t.dueDate ? `<span>📅 截止：${t.dueDate}</span>` : ''}
            ${sourceText ? `<span>${sourceText}</span>` : ''}
            <span>📝 关联：${getNoteTitle(t.noteId)}</span>
          </div>
        </div>
        <div class="interaction-card-actions">
          <button class="icon-btn" onclick="openInteractionModal('todo', '${t.id}')">✏️</button>
          <button class="icon-btn danger" onclick="deleteInteraction('${t.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function openInteractionModal(defaultType, editId) {
  const types = [
    { value: 'comment', text: '评论' },
    { value: 'dm', text: '私信' },
    { value: 'question', text: '问题' },
    { value: 'todo', text: '待办' }
  ];
  const isEdit = !!editId;
  const interactions = StorageManager.getInteractions();
  const editItem = isEdit ? interactions.find(i => i.id === editId) : null;
  const rawType = defaultType || editItem?.type || currentInteractionTab;
  const type = TAB_TO_TYPE[rawType] || rawType || 'comment';
  const notes = StorageManager.getNotes();
  const noteOptions = notes.map(n => `<option value="${n.id}"${(editItem?.noteId || '') === n.id ? ' selected' : ''}>${n.title}</option>`).join('') || '<option value="">暂无笔记</option>';
  const isTodo = type === 'todo';
  const data = editItem || {
    id: generateId(),
    type,
    username: '',
    content: '',
    noteId: '',
    priority: 'medium',
    dueDate: '',
    assignee: '',
    completed: false,
    createdAt: new Date().toISOString()
  };
  const modal = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? '编辑记录' : '新建记录'}</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="interaction-id" value="${data.id}">
          <div class="form-group">
            <label class="form-label">类型</label>
            <select class="form-select" style="width:100%" id="interaction-type" onchange="toggleTodoFields(this.value)">
              ${types.map(t => `<option value="${t.value}"${data.type === t.value ? ' selected' : ''}>${t.text}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input type="text" class="form-input" id="interaction-username" placeholder="输入用户名" value="${data.username || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">关联笔记</label>
              <select class="form-select" style="width:100%" id="interaction-note">${noteOptions}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${isTodo ? '待办内容' : '内容'}</label>
            <textarea class="form-textarea" id="interaction-content" placeholder="输入内容..." style="min-height:100px">${data.content || ''}</textarea>
          </div>
          <div id="todo-fields" style="${isTodo ? '' : 'display:none'}">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">负责人</label>
                <input type="text" class="form-input" id="interaction-assignee" placeholder="输入负责人姓名" value="${data.assignee || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">优先级</label>
                <select class="form-select" style="width:100%" id="interaction-priority">
                  <option value="high"${data.priority === 'high' ? ' selected' : ''}>高</option>
                  <option value="medium"${data.priority === 'medium' ? ' selected' : ''}>中</option>
                  <option value="low"${data.priority === 'low' ? ' selected' : ''}>低</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">截止日期</label>
                <input type="date" class="form-input" id="interaction-duedate" value="${data.dueDate || ''}">
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="saveInteractionFromModal()">保存</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modal;
}

function toggleTodoFields(type) {
  const fields = document.getElementById('todo-fields');
  if (fields) fields.style.display = type === 'todo' ? '' : 'none';
}

function saveInteractionFromModal() {
  const id = document.getElementById('interaction-id').value;
  const interactions = StorageManager.getInteractions();
  const existing = interactions.find(i => i.id === id);
  const type = document.getElementById('interaction-type').value;
  const isTodo = type === 'todo';
  const data = {
    id,
    type,
    username: document.getElementById('interaction-username').value.trim(),
    noteId: document.getElementById('interaction-note').value,
    content: document.getElementById('interaction-content').value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    completed: existing?.completed || false
  };
  if (existing?.sourceId) {
    data.sourceId = existing.sourceId;
    data.sourceType = existing.sourceType;
  }
  if (isTodo) {
    data.priority = document.getElementById('interaction-priority').value;
    data.dueDate = document.getElementById('interaction-duedate').value;
    data.assignee = document.getElementById('interaction-assignee').value.trim();
    data.title = data.content;
  }
  const idx = interactions.findIndex(i => i.id === id);
  if (idx === -1) interactions.push(data); else interactions[idx] = data;
  StorageManager.save('interactions', interactions);
  closeModal();
  currentInteractionTab = TYPE_TO_TAB[type] || type;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === currentInteractionTab));
  renderInteractionStats();
  renderInteractionContent();
  showToast('记录已保存', 'success');
}

function deleteInteraction(id) {
  if (!confirm('确定删除此记录？')) return;
  let interactions = StorageManager.getInteractions();
  interactions = interactions.filter(i => i.id !== id);
  StorageManager.save('interactions', interactions);
  closeModal();
  renderInteractionStats();
  renderInteractionContent();
  showToast('记录已删除', 'info');
}

function createTodoFromInteraction(id) {
  const interactions = StorageManager.getInteractions();
  const source = interactions.find(i => i.id === id);
  if (!source) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateInput(tomorrow);
  const todo = {
    id: generateId(),
    type: 'todo',
    username: source.username || '',
    noteId: source.noteId || '',
    content: `【${source.type === 'comment' ? '评论' : source.type === 'dm' ? '私信' : '问题'}回复】${source.content || ''}`,
    priority: 'medium',
    dueDate: tomorrowStr,
    assignee: source.username || '',
    completed: false,
    sourceId: source.id,
    sourceType: source.type,
    createdAt: new Date().toISOString()
  };
  interactions.push(todo);
  StorageManager.save('interactions', interactions);
  currentInteractionTab = 'todos';
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === 'todos'));
  renderInteractionStats();
  renderInteractionContent();
  showToast('待办已生成（截止明天）', 'success');
}

function toggleTodoStatus(id, completed) {
  const interactions = StorageManager.getInteractions();
  const idx = interactions.findIndex(i => i.id === id);
  if (idx === -1) return;
  interactions[idx].completed = completed;
  StorageManager.save('interactions', interactions);
  renderInteractionStats();
  renderInteractionContent();
  if (typeof currentModule === 'string' && currentModule === 'schedule' && typeof renderSchedule === 'function') {
    renderSchedule();
  }
}