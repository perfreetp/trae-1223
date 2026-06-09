let currentCompetitorTags = [];

function getCompetitors() {
  return StorageManager.getCompetitors();
}

function saveCompetitors(list) {
  StorageManager.set('competitors', list);
}

function renderCompetitors(list) {
  const grid = document.getElementById('competitors-grid');
  if (!list || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>暂无竞品数据</h3>
        <p>点击"添加竞品"开始记录对标笔记</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(c => `
    <div class="competitor-card">
      <div class="competitor-cover">
        ${c.cover 
          ? `<img src="${c.cover}" alt="">` 
          : `<div class="competitor-cover-placeholder">🖼️</div>`
        }
        <span class="competitor-status-badge ${c.status === 'archived' ? 'status-archived' : 'status-published'}" style="background: ${c.status === 'archived' ? 'rgba(153,153,153,0.9)' : 'rgba(82,196,26,0.9)'}; color: #fff;">
          ${c.status === 'archived' ? '已归档' : '监控中'}
        </span>
      </div>
      <div class="competitor-body">
        <div class="competitor-title" title="${escapeHtml(c.title || '')}">${escapeHtml(c.title || '无标题')}</div>
        <div class="competitor-account">
          <span>👤</span>
          <span>${escapeHtml(c.account || '未知账号')}</span>
        </div>
        <div class="competitor-card-stats">
          <div class="competitor-card-stat">
            <span>❤️</span>
            <strong>${formatNumber(c.likes || 0)}</strong>
          </div>
          <div class="competitor-card-stat">
            <span>⭐</span>
            <strong>${formatNumber(c.favorites || 0)}</strong>
          </div>
          <div class="competitor-card-stat">
            <span>💬</span>
            <strong>${formatNumber(c.comments || 0)}</strong>
          </div>
        </div>
        <div class="competitor-tags">
          ${(c.tags || []).map(t => `<span class="keyword-tag">#${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="competitor-footer">
          <span class="competitor-date">${c.recordDate || ''}</span>
          <div class="competitor-actions">
            <button class="icon-btn" title="更新数据" onclick="updateCompetitorStats('${c.id}')">🔄</button>
            <button class="icon-btn" title="编辑" onclick="openCompetitorModal('${c.id}')">✏️</button>
            <button class="icon-btn" title="${c.status === 'archived' ? '取消归档' : '归档'}" onclick="toggleCompetitorArchive('${c.id}')">
              ${c.status === 'archived' ? '↩️' : '📦'}
            </button>
            <button class="icon-btn danger" title="删除" onclick="deleteCompetitor('${c.id}')">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCompetitorStats() {
  const list = getCompetitors().filter(c => c.status !== 'archived');
  const total = list.length;
  const avgLikes = total > 0 ? Math.round(list.reduce((s, c) => s + (c.likes || 0), 0) / total) : 0;
  const avgFavorites = total > 0 ? Math.round(list.reduce((s, c) => s + (c.favorites || 0), 0) / total) : 0;
  const topPerformer = total > 0 
    ? list.reduce((max, c) => (c.likes || 0) > (max.likes || 0) ? c : max, list[0])
    : null;

  document.getElementById('stat-competitors').textContent = total;
  document.getElementById('stat-avg-likes').textContent = formatNumber(avgLikes);
  document.getElementById('stat-avg-favorites').textContent = formatNumber(avgFavorites);
  document.getElementById('stat-top-performer').textContent = topPerformer 
    ? (topPerformer.title || '').substring(0, 12) + ((topPerformer.title || '').length > 12 ? '...' : '')
    : '-';
}

function filterCompetitors() {
  const keyword = (document.getElementById('competitor-search')?.value || '').toLowerCase();
  const status = document.getElementById('competitor-status-filter')?.value || 'all';
  
  let list = getCompetitors();
  
  if (status !== 'all') {
    list = list.filter(c => c.status === status);
  }
  
  if (keyword) {
    list = list.filter(c => 
      (c.title || '').toLowerCase().includes(keyword) ||
      (c.account || '').toLowerCase().includes(keyword) ||
      (c.tags || []).some(t => t.toLowerCase().includes(keyword))
    );
  }
  
  renderCompetitors(list);
}

function openCompetitorModal(competitorOrId) {
  const list = getCompetitors();
  let competitor = null;
  let isEdit = false;

  if (typeof competitorOrId === 'string' && competitorOrId) {
    competitor = list.find(c => c.id === competitorOrId);
    isEdit = true;
  } else if (competitorOrId && typeof competitorOrId === 'object') {
    competitor = competitorOrId;
  }

  currentCompetitorTags = competitor?.tags ? [...competitor.tags] : [];

  const modalHtml = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>${isEdit ? '编辑竞品' : '添加竞品'}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="competitor-id" value="${competitor?.id || ''}">
          
          <div class="form-group">
            <label class="form-label">笔记链接 URL</label>
            <input type="text" class="form-input" id="competitor-url" placeholder="https://..." value="${escapeHtml(competitor?.url || '')}">
          </div>
          
          <div class="form-group">
            <label class="form-label">笔记标题</label>
            <input type="text" class="form-input" id="competitor-title" placeholder="输入笔记标题" value="${escapeHtml(competitor?.title || '')}">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">竞品账号名</label>
              <input type="text" class="form-input" id="competitor-account" placeholder="账号名称" value="${escapeHtml(competitor?.account || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">记录日期</label>
              <input type="date" class="form-input" id="competitor-date" value="${competitor?.recordDate || formatDateInput(new Date())}">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">封面图片</label>
            <div class="images-manager" style="padding: 16px;">
              <div id="competitor-cover-preview" style="margin-bottom: 12px;">
                ${competitor?.cover 
                  ? `<div style="position:relative;width:120px;aspect-ratio:3/4;border-radius:8px;overflow:hidden;">
                       <img src="${competitor.cover}" style="width:100%;height:100%;object-fit:cover;">
                       <button onclick="clearCompetitorCover()" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(255,77,79,0.9);color:#fff;cursor:pointer;">✕</button>
                     </div>`
                  : ''}
              </div>
              <input type="hidden" id="competitor-cover" value="${competitor?.cover || ''}">
              <input type="file" id="competitor-cover-file" accept="image/*" style="display:none;" onchange="handleCompetitorCoverUpload(event)">
              <button class="btn-secondary" onclick="document.getElementById('competitor-cover-file').click()">📤 上传图片</button>
              <input type="text" class="form-input" style="margin-top:10px;" id="competitor-cover-url" placeholder="或粘贴图片URL" onchange="handleCompetitorCoverUrl(event)" value="">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">❤️ 点赞数</label>
              <input type="number" class="form-input" id="competitor-likes" min="0" value="${competitor?.likes || 0}">
            </div>
            <div class="form-group">
              <label class="form-label">⭐ 收藏数</label>
              <input type="number" class="form-input" id="competitor-favorites" min="0" value="${competitor?.favorites || 0}">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">💬 评论数</label>
            <input type="number" class="form-input" id="competitor-comments" min="0" value="${competitor?.comments || 0}">
          </div>
          
          <div class="form-group">
            <label class="form-label">标签 <span class="label-extra">输入后按回车添加</span></label>
            <div class="tags-manager" id="competitor-tags-container">
              ${currentCompetitorTags.map(t => `
                <span class="tag-item">
                  #${escapeHtml(t)}
                  <button class="tag-remove" onclick="removeCompetitorTag('${escapeHtml(t)}')">✕</button>
                </span>
              `).join('')}
              <input type="text" class="tag-input" id="competitor-tag-input" placeholder="输入标签..." onkeydown="handleCompetitorTagKeydown(event)">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">状态</label>
            <select class="form-select" id="competitor-status" style="width:100%;">
              <option value="monitoring" ${competitor?.status === 'monitoring' ? 'selected' : ''}>监控中</option>
              <option value="archived" ${competitor?.status === 'archived' ? 'selected' : ''}>已归档</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">学习点 / 分析备注</label>
            <textarea class="form-textarea" id="competitor-notes" rows="4" placeholder="记录值得学习的点和分析...">${escapeHtml(competitor?.notes || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="saveCompetitorFromModal()">保存</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modalHtml;
}

function clearCompetitorCover() {
  document.getElementById('competitor-cover').value = '';
  document.getElementById('competitor-cover-preview').innerHTML = '';
}

function handleCompetitorCoverUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById('competitor-cover').value = base64;
    document.getElementById('competitor-cover-preview').innerHTML = `
      <div style="position:relative;width:120px;aspect-ratio:3/4;border-radius:8px;overflow:hidden;">
        <img src="${base64}" style="width:100%;height:100%;object-fit:cover;">
        <button onclick="clearCompetitorCover()" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(255,77,79,0.9);color:#fff;cursor:pointer;">✕</button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function handleCompetitorCoverUrl(event) {
  const url = event.target.value.trim();
  if (!url) return;
  document.getElementById('competitor-cover').value = url;
  document.getElementById('competitor-cover-preview').innerHTML = `
    <div style="position:relative;width:120px;aspect-ratio:3/4;border-radius:8px;overflow:hidden;">
      <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;color:#999;font-size:24px;\\'>🖼️</div>'">
      <button onclick="clearCompetitorCover()" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(255,77,79,0.9);color:#fff;cursor:pointer;">✕</button>
    </div>
  `;
}

function handleCompetitorTagKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = event.target;
    const value = input.value.trim();
    if (value && !currentCompetitorTags.includes(value)) {
      currentCompetitorTags.push(value);
      refreshCompetitorTags();
    }
    input.value = '';
  }
}

function removeCompetitorTag(tag) {
  currentCompetitorTags = currentCompetitorTags.filter(t => t !== tag);
  refreshCompetitorTags();
}

function refreshCompetitorTags() {
  const container = document.getElementById('competitor-tags-container');
  if (!container) return;
  const input = container.querySelector('#competitor-tag-input');
  const inputHtml = input ? input.outerHTML : '<input type="text" class="tag-input" id="competitor-tag-input" placeholder="输入标签..." onkeydown="handleCompetitorTagKeydown(event)">';
  
  container.innerHTML = currentCompetitorTags.map(t => `
    <span class="tag-item">
      #${escapeHtml(t)}
      <button class="tag-remove" onclick="removeCompetitorTag('${escapeHtml(t)}')">✕</button>
    </span>
  `).join('') + inputHtml;
}

function saveCompetitorFromModal() {
  const id = document.getElementById('competitor-id').value;
  const list = getCompetitors();

  const data = {
    id: id || uid(),
    url: document.getElementById('competitor-url').value.trim(),
    title: document.getElementById('competitor-title').value.trim(),
    account: document.getElementById('competitor-account').value.trim(),
    recordDate: document.getElementById('competitor-date').value,
    cover: document.getElementById('competitor-cover').value,
    likes: parseInt(document.getElementById('competitor-likes').value) || 0,
    favorites: parseInt(document.getElementById('competitor-favorites').value) || 0,
    comments: parseInt(document.getElementById('competitor-comments').value) || 0,
    tags: [...currentCompetitorTags],
    status: document.getElementById('competitor-status').value,
    notes: document.getElementById('competitor-notes').value,
    updatedAt: Date.now()
  };

  if (!data.title) {
    showToast('请输入笔记标题', 'error');
    return;
  }

  const idx = list.findIndex(c => c.id === data.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...data };
  } else {
    data.createdAt = Date.now();
    list.unshift(data);
  }

  saveCompetitors(list);
  closeModal();
  filterCompetitors();
  renderCompetitorStats();
  showToast(id ? '已更新竞品数据' : '已添加竞品', 'success');
}

function deleteCompetitor(id) {
  if (!confirm('确定要删除这个竞品记录吗？')) return;
  let list = getCompetitors();
  list = list.filter(c => c.id !== id);
  saveCompetitors(list);
  filterCompetitors();
  renderCompetitorStats();
  showToast('已删除', 'success');
}

function toggleCompetitorArchive(id) {
  const list = getCompetitors();
  const idx = list.findIndex(c => c.id === id);
  if (idx < 0) return;
  list[idx].status = list[idx].status === 'archived' ? 'monitoring' : 'archived';
  list[idx].updatedAt = Date.now();
  saveCompetitors(list);
  filterCompetitors();
  renderCompetitorStats();
  showToast(list[idx].status === 'archived' ? '已归档' : '已恢复监控', 'success');
}

function updateCompetitorStats(id) {
  const list = getCompetitors();
  const competitor = list.find(c => c.id === id);
  if (!competitor) return;

  const modalHtml = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()" style="max-width:420px;">
        <div class="modal-header">
          <h3>更新数据 - ${escapeHtml(competitor.title || '').substring(0, 20)}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">❤️ 点赞数</label>
              <input type="number" class="form-input" id="update-likes" min="0" value="${competitor.likes || 0}">
            </div>
            <div class="form-group">
              <label class="form-label">⭐ 收藏数</label>
              <input type="number" class="form-input" id="update-favorites" min="0" value="${competitor.favorites || 0}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">💬 评论数</label>
            <input type="number" class="form-input" id="update-comments" min="0" value="${competitor.comments || 0}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="confirmUpdateStats('${id}')">保存</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modalHtml;
}

function confirmUpdateStats(id) {
  const list = getCompetitors();
  const idx = list.findIndex(c => c.id === id);
  if (idx < 0) return;

  list[idx].likes = parseInt(document.getElementById('update-likes').value) || 0;
  list[idx].favorites = parseInt(document.getElementById('update-favorites').value) || 0;
  list[idx].comments = parseInt(document.getElementById('update-comments').value) || 0;
  list[idx].updatedAt = Date.now();

  saveCompetitors(list);
  closeModal();
  filterCompetitors();
  renderCompetitorStats();
  showToast('数据已更新', 'success');
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('module-competitors')) {
    renderCompetitorStats();
    filterCompetitors();
  }
});
