function getWeekDatesByOffset(offset) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDiff + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderTeamView() {
  const weekOffset = parseInt(document.getElementById('team-week-filter')?.value || '0', 10);
  const weekDates = getWeekDatesByOffset(weekOffset);
  const weekStart = formatDateYMD(weekDates[0]);
  const weekEnd = formatDateYMD(weekDates[6]);

  const todos = StorageManager.getInteractions().filter(i => i.type === 'todo');
  const schedules = StorageManager.getSchedules();
  const notes = StorageManager.getNotes();
  const templates = StorageManager.getTemplates();

  const summary = {
    totalMembers: 0,
    pendingTodos: todos.filter(t => !t.completed).length,
    totalTodos: todos.length,
    weekSchedules: schedules.filter(s => s.date >= weekStart && s.date <= weekEnd).length,
    publishedNotes: notes.filter(n => n.publishDate && n.publishDate >= weekStart && n.publishDate <= weekEnd).length
  };

  const assigneeMap = {};
  function ensureAssignee(name) {
    const key = name || '未分配';
    if (!assigneeMap[key]) {
      assigneeMap[key] = {
        name: key,
        todos: [],
        schedules: [],
        templates: new Map(),
        templateUseCount: 0,
        notes: []
      };
    }
    return assigneeMap[key];
  }

  todos.forEach(todo => {
    const a = ensureAssignee(todo.assignee);
    a.todos.push(todo);
  });

  schedules.forEach(s => {
    if (s.date >= weekStart && s.date <= weekEnd) {
      const a = ensureAssignee(s.assignee || s.owner || s.accountName);
      a.schedules.push(s);
    }
  });

  templates.forEach(tpl => {
    (tpl.useHistory || []).forEach(h => {
      if (h.noteTitle) {
        const a = ensureAssignee(h.assignee || '未分配');
        a.templates.set(tpl.id, tpl);
        a.templateUseCount += 1;
      }
    });
  });

  notes.forEach(n => {
    const a = ensureAssignee(n.assignee || n.author || '未分配');
    a.notes.push(n);
  });

  if (Object.keys(assigneeMap).length === 0) {
    ensureAssignee('未分配');
  }
  summary.totalMembers = Object.keys(assigneeMap).length;

  const summaryEl = document.getElementById('team-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div>
          <span class="stat-value">${summary.totalMembers}</span>
          <span class="stat-label">团队成员</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div>
          <span class="stat-value" style="color:var(--primary-color);">${summary.pendingTodos}</span>
          <span class="stat-label">待办未完成 / 共 ${summary.totalTodos}</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📅</span>
        <div>
          <span class="stat-value">${summary.weekSchedules}</span>
          <span class="stat-label">本周排期</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📒</span>
        <div>
          <span class="stat-value">${summary.publishedNotes}</span>
          <span class="stat-label">本周已发布笔记</span>
        </div>
      </div>
    `;
  }

  const grid = document.getElementById('team-grid');
  if (!grid) return;
  const assignees = Object.keys(assigneeMap).sort((a, b) => {
    if (a === '未分配') return 1;
    if (b === '未分配') return -1;
    return a.localeCompare(b, 'zh');
  });
  grid.innerHTML = assignees.map(key => {
    const a = assigneeMap[key];
    const pending = a.todos.filter(t => !t.completed).length;
    const done = a.todos.filter(t => t.completed).length;
    const weekSchedules = a.schedules.filter(s => s.date >= weekStart && s.date <= weekEnd);
    const pendingTodosList = a.todos.filter(t => !t.completed).slice(0, 5);
    const doneTodosList = a.todos.filter(t => t.completed).slice(0, 3);
    const weekSchedulesList = weekSchedules.slice(0, 5);
    const tplArr = Array.from(a.templates.values()).slice(0, 4);
    const weekNotes = a.notes.filter(n => (n.publishDate && n.publishDate >= weekStart && n.publishDate <= weekEnd) || (n.updatedAt && n.updatedAt >= weekStart && n.updatedAt <= weekEnd)).slice(0, 5);

    return `
      <div class="team-card">
        <div class="team-card-header">
          <div class="team-avatar">${key === '未分配' ? '❓' : escapeHtml(key.substring(0, 1))}</div>
          <div class="team-name-wrap">
            <div class="team-name">${escapeHtml(key)}</div>
            <div class="team-meta">
              <span style="color:var(--primary-color);">${pending}</span> 待办 · 
              ${done} 已完成 · 
              ${weekSchedules.length} 排期 · 
              ${a.templateUseCount} 次模板使用
            </div>
          </div>
        </div>

        <div class="team-progress-bar-wrap">
          <div class="team-progress-bar">
            <div class="team-progress-done" style="width:${a.todos.length > 0 ? (done / a.todos.length * 100) : 0}%"></div>
          </div>
          <span class="team-progress-text">${a.todos.length > 0 ? Math.round(done / a.todos.length * 100) : 0}%</span>
        </div>

        <div class="team-section">
          <div class="team-section-title"><span>📋 待办清单</span><span>${pending} 未完成</span></div>
          ${pendingTodosList.length > 0 ? pendingTodosList.map(t => `
            <div class="team-todo-item">
              <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="event.stopPropagation();toggleTodoStatus('${t.id}', this.checked);setTimeout(renderTeamView,50);">
              <div class="team-todo-content${t.completed ? ' done' : ''}">
                <span>${escapeHtml((t.title || t.content || '').substring(0, 30))}</span>
                ${t.dueDate ? `<span class="team-todo-date">📅 ${t.dueDate.substring(5)}</span>` : ''}
              </div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--text-tertiary);padding:8px;">✅ 暂无待办</div>'}
        </div>

        <div class="team-section">
          <div class="team-section-title"><span>📅 本周排期</span><span>${weekSchedules.length} 项</span></div>
          ${weekSchedulesList.length > 0 ? weekSchedulesList.map(s => {
            const note = notes.find(n => n.id === s.noteId);
            const colors = { pending: '#FAAD14', published: '#52C41A', done: '#52C41A', cancelled: '#999' };
            const texts = { pending: '待发布', published: '已发布', done: '已完成', cancelled: '已取消' };
            return `
              <div class="team-schedule-item" style="border-left:3px solid ${colors[s.status] || '#999'};">
                <div class="team-schedule-date">${s.date.substring(5)} ${s.time || ''}</div>
                <div class="team-schedule-title">${note ? escapeHtml(note.title.substring(0, 18)) : '未关联笔记'}</div>
                <span class="team-schedule-status" style="background:${colors[s.status] || '#999'}15;color:${colors[s.status] || '#999'};">${texts[s.status] || ''}</span>
              </div>
            `;
          }).join('') : '<div style="font-size:12px;color:var(--text-tertiary);padding:8px;">本周无排期</div>'}
        </div>

        <div class="team-section">
          <div class="team-section-title"><span>🎨 模板使用</span><span>${a.templateUseCount} 次</span></div>
          ${tplArr.length > 0 ? tplArr.map(t => `
            <div class="team-template-item">
              <span style="font-size:16px;">${t.icon || '📝'}</span>
              <div class="team-template-info">
                <div class="team-template-name">${escapeHtml(t.name || '')}</div>
                <div class="team-template-meta">${t.useCount || 0} 次总使用${t.lastUsedAt ? ' · 最近 ' + new Date(t.lastUsedAt).toLocaleDateString('zh-CN') : ''}</div>
              </div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--text-tertiary);padding:8px;">暂无模板使用记录</div>'}
        </div>

        <div class="team-section">
          <div class="team-section-title"><span>📒 本周笔记</span><span>${weekNotes.length} 篇</span></div>
          ${weekNotes.length > 0 ? weekNotes.map(n => `
            <div class="team-note-item">
              <div class="team-note-title">${escapeHtml((n.title || '无标题').substring(0, 24))}</div>
              <div class="team-note-meta">
                ${n.status === 'published' || n.status === 'done' ? '<span style="color:#52C41A;">已发布</span>' : '<span style="color:#FAAD14;">草稿</span>'}
                · ❤️ ${formatNumber(n.likes || 0)} ⭐ ${formatNumber(n.favorites || 0)}
              </div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--text-tertiary);padding:8px;">本周无更新</div>'}
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('module-team')) {
    renderTeamView();
  }
});
