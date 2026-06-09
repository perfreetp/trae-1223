let currentWeekOffset = 0;

function getWeekDates(offset) {
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

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function renderSchedule() {
  const accounts = StorageManager.getAccounts();
  const schedules = StorageManager.getSchedules();
  const accountFilter = document.getElementById('schedule-account-filter').value;
  const weekDates = getWeekDates(currentWeekOffset);
  const today = new Date();
  const weekLabel = document.getElementById('week-label');
  const start = weekDates[0];
  const end = weekDates[6];
  weekLabel.textContent = currentWeekOffset === 0 ? '本周' : `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;

  const filteredAccounts = accountFilter === 'all' ? accounts : accounts.filter(a => a.id === accountFilter);

  const accountsCol = document.getElementById('schedule-accounts');
  accountsCol.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'schedule-account-header';
  header.textContent = '账号';
  accountsCol.appendChild(header);
  filteredAccounts.forEach(acc => {
    const row = document.createElement('div');
    row.className = 'schedule-account-row';
    row.innerHTML = `<div class="account-color-dot" style="background:${acc.color || '#FE2C55'}"></div><div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${acc.name}</div>`;
    accountsCol.appendChild(row);
  });

  const daysHeader = document.getElementById('schedule-days-header');
  daysHeader.style.gridTemplateColumns = `repeat(7, minmax(140px, 1fr))`;
  daysHeader.innerHTML = '';
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  weekDates.forEach((date, idx) => {
    const dayCell = document.createElement('div');
    dayCell.className = 'schedule-day-header';
    const isToday = isSameDate(date, today);
    const isWeekend = idx >= 5;
    dayCell.innerHTML = `<div class="schedule-day-name">${dayNames[idx]}</div><div class="schedule-day-date${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}">${date.getMonth() + 1}/${date.getDate()}</div>`;
    daysHeader.appendChild(dayCell);
  });

  const grid = document.getElementById('schedule-grid');
  grid.style.gridTemplateColumns = `repeat(7, minmax(140px, 1fr))`;
  grid.innerHTML = '';
  filteredAccounts.forEach(acc => {
    weekDates.forEach((date, idx) => {
      const cell = document.createElement('div');
      cell.className = 'schedule-cell';
      const dateStr = formatDateStr(date);
      const isToday = isSameDate(date, today);
      const isWeekend = idx >= 5;
      if (isToday) cell.classList.add('today');
      cell.dataset.accountId = acc.id;
      cell.dataset.date = dateStr;
      cell.addEventListener('dragover', dragOver);
      cell.addEventListener('drop', (e) => drop(e, acc.id, dateStr));
      const cellSchedules = schedules.filter(s => s.accountId === acc.id && s.date === dateStr);
      cellSchedules.forEach(s => {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        item.draggable = true;
        item.style.borderLeftColor = acc.color || '#FE2C55';
        item.style.background = `${acc.color || '#FE2C55'}15`;
        item.dataset.id = s.id;
        const note = StorageManager.getNotes().find(n => n.id === s.noteId);
        const statusColors = { pending: '#FAAD14', published: '#52C41A', done: '#52C41A', cancelled: '#999' };
        const statusTexts = { pending: '待发布', published: '已发布', done: '已完成', cancelled: '已取消' };
        item.innerHTML = `
          <div class="schedule-item-title">${note ? note.title : '未关联笔记'}</div>
          <div class="schedule-item-meta">${s.time || ''} ${s.column || s.type || ''}</div>
          <div style="margin-top:4px"><span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;background:${statusColors[s.status]}20;color:${statusColors[s.status]}">${statusTexts[s.status] || ''}</span></div>
          <button class="schedule-item-remove" onclick="event.stopPropagation();deleteSchedule('${s.id}')">×</button>
        `;
        item.addEventListener('click', () => openScheduleModal(s));
        item.addEventListener('dragstart', dragStart);
        item.addEventListener('dragend', dragEnd);
        cell.appendChild(item);
      });
      grid.appendChild(cell);
    });
  });
}

function renderAccountFilter() {
  const accounts = StorageManager.getAccounts();
  const select = document.getElementById('schedule-account-filter');
  const current = select.value;
  select.innerHTML = '<option value="all">全部账号</option>';
  accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.name;
    select.appendChild(opt);
  });
  select.value = current || 'all';
}

function changeWeek(offset) {
  currentWeekOffset += offset;
  renderSchedule();
}

function goToToday() {
  currentWeekOffset = 0;
  renderSchedule();
}

let draggedScheduleId = null;

function dragStart(e) {
  draggedScheduleId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.schedule-cell').forEach(c => c.classList.remove('drag-over'));
  draggedScheduleId = null;
}

function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function drop(e, accountId, date) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedScheduleId) return;
  const schedules = StorageManager.getSchedules();
  const idx = schedules.findIndex(s => s.id === draggedScheduleId);
  if (idx === -1) return;
  schedules[idx].accountId = accountId;
  schedules[idx].date = date;
  StorageManager.save('schedules', schedules);
  renderSchedule();
  showToast('排期已更新', 'success');
}

function openScheduleModal(schedule) {
  const isEdit = !!schedule;
  const notes = StorageManager.getNotes();
  const accounts = StorageManager.getAccounts();
  const weekDates = getWeekDates(currentWeekOffset);
  const s = schedule || { id: generateId(), noteId: '', accountId: accounts[0]?.id || '', column: '', date: formatDateStr(weekDates[0]), time: '09:00', status: 'pending', remark: '' };
  const noteOptions = notes.map(n => `<option value="${n.id}"${n.id === s.noteId ? ' selected' : ''}>${n.title}</option>`).join('') || '<option value="">暂无笔记</option>';
  const accountOptions = accounts.map(a => `<option value="${a.id}"${a.id === s.accountId ? ' selected' : ''}>${a.name}</option>`).join('') || '<option value="">暂无账号</option>';
  const dateOptions = weekDates.map(d => { const str = formatDateStr(d); return `<option value="${str}"${str === s.date ? ' selected' : ''}>${d.getMonth() + 1}月${d.getDate()}日</option>`; }).join('');
  const modal = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? '编辑排期' : '新建排期'}</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="schedule-id" value="${s.id}">
          <div class="form-group">
            <label class="form-label">关联笔记</label>
            <select class="form-select" style="width:100%" id="schedule-note">${noteOptions}</select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">账号</label>
              <select class="form-select" style="width:100%" id="schedule-account">${accountOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">栏目</label>
              <input type="text" class="form-input" id="schedule-column" placeholder="如：好物分享" value="${s.column || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">日期</label>
              <select class="form-select" style="width:100%" id="schedule-date">${dateOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">时间</label>
              <input type="time" class="form-input" id="schedule-time" value="${s.time || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select class="form-select" style="width:100%" id="schedule-status">
              <option value="pending"${s.status === 'pending' ? ' selected' : ''}>待发布</option>
              <option value="published"${s.status === 'published' ? ' selected' : ''}>已发布</option>
              <option value="done"${s.status === 'done' ? ' selected' : ''}>已完成</option>
              <option value="cancelled"${s.status === 'cancelled' ? ' selected' : ''}>已取消</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" id="schedule-remark" placeholder="填写备注信息..." style="min-height:80px">${s.remark || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          ${isEdit ? `<button class="btn-secondary" onclick="deleteSchedule('${s.id}');closeModal()">删除</button>` : ''}
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="saveScheduleFromModal()">保存</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modal;
}

function saveScheduleFromModal() {
  const id = document.getElementById('schedule-id').value;
  const schedules = StorageManager.getSchedules();
  const data = {
    id,
    noteId: document.getElementById('schedule-note').value,
    accountId: document.getElementById('schedule-account').value,
    column: document.getElementById('schedule-column').value.trim(),
    date: document.getElementById('schedule-date').value,
    time: document.getElementById('schedule-time').value,
    status: document.getElementById('schedule-status').value,
    remark: document.getElementById('schedule-remark').value.trim()
  };
  const idx = schedules.findIndex(s => s.id === id);
  if (idx === -1) schedules.push(data); else schedules[idx] = data;
  StorageManager.save('schedules', schedules);
  closeModal();
  renderSchedule();
  showToast('排期已保存', 'success');
}

function deleteSchedule(id) {
  if (!confirm('确定删除此排期？')) return;
  let schedules = StorageManager.getSchedules();
  schedules = schedules.filter(s => s.id !== id);
  StorageManager.save('schedules', schedules);
  closeModal();
  renderSchedule();
  showToast('排期已删除', 'info');
}