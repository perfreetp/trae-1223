const NOTE_STATUS = {
  pending: { label: '待创作', class: 'status-pending' },
  draft: { label: '草稿', class: 'status-draft' },
  published: { label: '已发布', class: 'status-published' }
};

const EDITOR_DEFAULT_FORBIDDEN_WORDS = [
  '最好', '第一', '唯一', '顶级', '极品', '极致', '万能',
  '国家级', '世界级', '全球首发', '全网最低', '史无前例',
  '绝对', '永久', '100%', '纯天然', '无毒副作用',
  '秒杀', '全网第一', '行业领先', '领导者', '缔造者'
];

let currentSelectedNoteId = null;
let currentEditorTopicFilter = '';
let dragSrcImageIndex = null;

function getNotes() {
  return StorageManager.getNotes();
}

function setNotes(notes) {
  StorageManager.set('notes', notes);
  updateStorageCount();
}

function getForbiddenWords() {
  const storageWords = StorageManager.getForbiddenWords();
  const custom = getCustomForbiddenWords();
  return [...new Set([...EDITOR_DEFAULT_FORBIDDEN_WORDS, ...storageWords, ...custom])];
}

function getCustomForbiddenWords() {
  return StorageManager.get('customForbiddenWords', []);
}

function setCustomForbiddenWords(words) {
  StorageManager.set('customForbiddenWords', words);
}

function renderNotesList() {
  const listEl = document.getElementById('notes-list');
  if (!listEl) return;

  let notes = getNotes();

  if (currentEditorTopicFilter) {
    notes = notes.filter(n => n.topicId === currentEditorTopicFilter);
  }

  const topics = getTopics();
  const topicMap = {};
  topics.forEach(t => { topicMap[t.id] = t; });

  if (notes.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 40px 16px; text-align: center; color: var(--text-tertiary);">
        <div style="font-size: 40px; margin-bottom: 12px; opacity: 0.5;">📝</div>
        <p style="font-size: 12px;">${currentEditorTopicFilter ? '该选题下暂无笔记' : '还没有笔记'}</p>
      </div>
    `;
    return;
  }

  notes.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  listEl.innerHTML = notes.map(note => {
    const topic = topicMap[note.topicId];
    const status = NOTE_STATUS[note.status] || NOTE_STATUS.draft;
    const title = note.title || '无标题笔记';
    const date = new Date(note.updatedAt || note.createdAt);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    return `
      <div class="note-list-item ${note.id === currentSelectedNoteId ? 'active' : ''}" 
           data-id="${note.id}" 
           onclick="selectNote('${note.id}')">
        <div class="note-list-title">${escapeHtml(title)}</div>
        <div class="note-list-meta">
          <span>${topic ? escapeHtml(topic.title.substring(0, 8)) : '未关联'}</span>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderTopicSelectOptions() {
  const selectEl = document.getElementById('editor-topic-select');
  if (!selectEl) return;

  const topics = getTopics();
  const currentVal = selectEl.value;

  selectEl.innerHTML = `<option value="">-- 选择关联选题 --</option>` +
    topics.map(t => `<option value="${t.id}">${escapeHtml(t.title)}</option>`).join('');

  selectEl.value = currentVal;
}

function loadTopicForEditor() {
  const selectEl = document.getElementById('editor-topic-select');
  currentEditorTopicFilter = selectEl ? selectEl.value : '';
  renderNotesList();
}

function openNoteModal(noteId) {
  const notes = getNotes();
  const topics = getTopics();
  const isEdit = !!noteId;
  const note = isEdit ? notes.find(n => n.id === noteId) : null;

  const title = isEdit ? '编辑笔记信息' : '新建笔记';
  const data = note || {
    topicId: currentEditorTopicFilter || (topics[0] ? topics[0].id : ''),
    title: '',
    status: 'draft'
  };

  const topicOptions = topics.map(t =>
    `<option value="${t.id}" ${data.topicId === t.id ? 'selected' : ''}>${escapeHtml(t.title)}</option>`
  ).join('');

  const statusOptions = Object.entries(NOTE_STATUS).map(([key, val]) =>
    `<option value="${key}" ${data.status === key ? 'selected' : ''}>${val.label}</option>`
  ).join('');

  const html = `
    <div class="modal-overlay" onclick="closeModalOnBackdrop(event)">
      <div class="modal" onclick="event.stopPropagation()" style="max-width: 480px;">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">关联选题</label>
            <select id="note-modal-topic" class="form-select" style="width: 100%;">
              <option value="">-- 不关联选题 --</option>
              ${topicOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">笔记标题 <span style="color: var(--danger-color);">*</span></label>
            <input type="text" id="note-modal-title" class="form-input" placeholder="输入笔记标题..." value="${escapeAttr(data.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select id="note-modal-status" class="form-select" style="width: 100%;">
              ${statusOptions}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">取消</button>
          <button class="btn-primary" onclick="saveNoteFromModal('${noteId || ''}')">${isEdit ? '保存' : '创建'}</button>
        </div>
      </div>
    </div>
  `;

  openModal(html, () => {
    setTimeout(() => {
      const titleEl = document.getElementById('note-modal-title');
      if (titleEl && !isEdit) titleEl.focus();
    }, 50);
  });
}

function saveNoteFromModal(noteId) {
  const topicEl = document.getElementById('note-modal-topic');
  const titleEl = document.getElementById('note-modal-title');
  const statusEl = document.getElementById('note-modal-status');

  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) {
    showToast('请输入笔记标题', 'warning');
    titleEl && titleEl.focus();
    return;
  }

  const notes = getNotes();
  const now = new Date().toISOString();

  if (noteId) {
    const idx = notes.findIndex(n => n.id === noteId);
    if (idx !== -1) {
      notes[idx] = {
        ...notes[idx],
        topicId: topicEl ? topicEl.value : '',
        title,
        status: statusEl ? statusEl.value : 'draft',
        updatedAt: now
      };
      showToast('笔记信息已更新', 'success');
    }
  } else {
    const newNote = {
      id: generateId(),
      topicId: topicEl ? topicEl.value : '',
      title,
      status: statusEl ? statusEl.value : 'draft',
      content: '',
      images: [],
      tags: [],
      createdAt: now,
      updatedAt: now
    };
    notes.unshift(newNote);
    currentSelectedNoteId = newNote.id;
    showToast('笔记创建成功', 'success');
  }

  setNotes(notes);
  renderNotesList();
  closeModal();

  if (!noteId) {
    selectNote(currentSelectedNoteId);
  } else if (noteId === currentSelectedNoteId) {
    const updated = notes.find(n => n.id === noteId);
    if (updated) renderEditor(updated);
  }
}

function selectNote(id) {
  currentSelectedNoteId = id;
  renderNotesList();

  const notes = getNotes();
  const note = notes.find(n => n.id === id);
  if (note) {
    renderEditor(note);
  }
}

function renderEditor(note) {
  const workspace = document.getElementById('editor-workspace');
  if (!workspace) return;

  const customWords = getCustomForbiddenWords();

  workspace.innerHTML = `
    <div class="editor-form">
      <div class="form-group">
        <label class="form-label">
          笔记标题
          <span class="label-extra">
            <span class="topic-status ${NOTE_STATUS[note.status] ? NOTE_STATUS[note.status].class : 'status-draft'}" style="margin-left: 8px;">
              ${NOTE_STATUS[note.status] ? NOTE_STATUS[note.status].label : '草稿'}
            </span>
          </span>
        </label>
        <input type="text" id="editor-title" class="form-input" placeholder="输入笔记标题..." value="${escapeAttr(note.title || '')}">
      </div>

      <div class="form-group">
        <label class="form-label">
          正文内容
          <span class="label-extra">支持 emoji、换行分段，建议 500-1500 字</span>
        </label>
        <textarea id="editor-content" class="form-textarea" placeholder="开始创作你的笔记正文..." rows="12">${escapeHtml(note.content || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">
          图片管理
          <span class="label-extra">支持拖拽排序、批量上传，建议 3:4 竖图</span>
        </label>
        <div class="images-manager" id="images-manager-${note.id}" 
             ondragover="handleImageDropZoneOver(event)" 
             ondragleave="handleImageDropZoneLeave(event)" 
             ondrop="handleImageDropZoneDrop(event, '${note.id}')">
          <div id="images-grid-${note.id}"></div>
          <div class="add-image-btn">
            <button class="btn-secondary" onclick="triggerImageUpload('${note.id}')">
              📷 选择图片上传
            </button>
            <input type="file" id="image-upload-${note.id}" accept="image/*" multiple style="display:none" onchange="handleImageFileSelect(event, '${note.id}')">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          笔记标签
          <span class="label-extra">输入后回车添加，最多 20 个标签</span>
        </label>
        <div id="tags-manager-${note.id}"></div>
      </div>

      <div class="form-group">
        <label class="form-label">
          禁用词检查
          <span class="label-extra">检测违规词、极限词等敏感内容</span>
        </label>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start;">
          <button class="btn-primary" onclick="runForbiddenCheck('${note.id}')">🔍 检查禁用词</button>
          <div style="flex: 1; min-width: 240px;">
            <input type="text" id="forbidden-word-input" class="form-input" placeholder="输入自定义禁用词，多个用逗号分隔" value="${escapeAttr(customWords.join(','))}">
            <button class="btn-secondary btn-sm" style="margin-top: 8px;" onclick="saveCustomForbiddenWords()">💾 保存自定义禁用词</button>
          </div>
        </div>
        <div id="forbidden-check-result" style="margin-top: 0;"></div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 12px; border-top: 1px solid var(--border-color);">
        <button class="btn-secondary" onclick="openNoteModal('${note.id}')">✏️ 修改信息</button>
        <button class="btn-primary" onclick="saveEditorContent()">💾 保存笔记</button>
      </div>
    </div>
  `;

  renderImages(note.images || [], note.id);
  renderTags(note.tags || [], note.id);
}

function triggerImageUpload(noteId) {
  const input = document.getElementById(`image-upload-${noteId}`);
  if (input) input.click();
}

function handleImageFileSelect(event, noteId) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  processImageFiles(Array.from(files), noteId);
  event.target.value = '';
}

function handleImageDropZoneOver(event) {
  event.preventDefault();
  event.currentTarget.style.borderColor = 'var(--primary-color)';
  event.currentTarget.style.background = 'rgba(254, 44, 85, 0.03)';
}

function handleImageDropZoneLeave(event) {
  event.currentTarget.style.borderColor = '';
  event.currentTarget.style.background = '';
}

function handleImageDropZoneDrop(event, noteId) {
  event.preventDefault();
  event.currentTarget.style.borderColor = '';
  event.currentTarget.style.background = '';

  const files = event.dataTransfer.files;
  if (!files || files.length === 0) return;

  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    showToast('请上传图片文件', 'warning');
    return;
  }

  processImageFiles(imageFiles, noteId);
}

function processImageFiles(files, noteId) {
  const notes = getNotes();
  const noteIdx = notes.findIndex(n => n.id === noteId);
  if (noteIdx === -1) return;

  let processedCount = 0;
  const totalFiles = files.length;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const notes = getNotes();
      const idx = notes.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        notes[idx].images = notes[idx].images || [];
        notes[idx].images.push({
          id: generateId(),
          src: base64,
          name: file.name,
          size: file.size
        });
        notes[idx].updatedAt = new Date().toISOString();
        setNotes(notes);
        processedCount++;
        if (processedCount === totalFiles) {
          renderImages(notes[idx].images, noteId);
          showToast(`成功添加 ${totalFiles} 张图片`, 'success');
        }
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderImages(images, noteId) {
  const grid = document.getElementById(`images-grid-${noteId}`);
  if (!grid) return;

  if (!images || images.length === 0) {
    grid.innerHTML = `
      <div class="images-empty" onclick="triggerImageUpload('${noteId}')">
        <div class="images-empty-icon">🖼️</div>
        <p style="font-size: 13px;">点击或拖拽图片到此处上传</p>
        <p style="font-size: 11px; margin-top: 4px;">支持 JPG、PNG、WEBP 格式</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = `
    <div class="images-grid">
      ${images.map((img, idx) => `
        <div class="image-item" 
             draggable="true"
             data-index="${idx}"
             data-note-id="${noteId}"
             ondragstart="handleImageDragStart(event, ${idx}, '${noteId}')"
             ondragend="handleImageDragEnd(event)"
             ondragover="handleImageDragOver(event, this)"
             ondragleave="handleImageDragLeave(event, this)"
             ondrop="handleImageDrop(event, ${idx}, '${noteId}')">
          <img src="${img.src}" alt="${escapeAttr(img.name || 'image')}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="image-placeholder" style="display:none;">🖼️</div>
          <div class="image-order">${idx + 1}</div>
          <button class="image-remove" onclick="removeImage('${noteId}', ${idx})" title="删除图片">×</button>
        </div>
      `).join('')}
    </div>
  `;
}

function handleImageDragStart(event, index, noteId) {
  dragSrcImageIndex = index;
  event.currentTarget.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', `${noteId}-${index}`);
}

function handleImageDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.image-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSrcImageIndex = null;
}

function handleImageDragOver(event, element) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  if (!element.classList.contains('dragging')) {
    element.classList.add('drag-over');
  }
}

function handleImageDragLeave(event, element) {
  element.classList.remove('drag-over');
}

function handleImageDrop(event, targetIndex, noteId) {
  event.preventDefault();
  event.stopPropagation();

  const element = event.currentTarget;
  element.classList.remove('drag-over');

  if (dragSrcImageIndex === null || dragSrcImageIndex === targetIndex) return;

  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;

  const images = notes[idx].images || [];
  const srcImg = images[dragSrcImageIndex];
  images.splice(dragSrcImageIndex, 1);
  images.splice(targetIndex, 0, srcImg);

  notes[idx].images = images;
  notes[idx].updatedAt = new Date().toISOString();
  setNotes(notes);
  renderImages(images, noteId);
}

function removeImage(noteId, index) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;

  notes[idx].images.splice(index, 1);
  notes[idx].updatedAt = new Date().toISOString();
  setNotes(notes);
  renderImages(notes[idx].images, noteId);
  showToast('图片已删除', 'info');
}

function renderTags(tags, noteId) {
  const container = document.getElementById(`tags-manager-${noteId}`);
  if (!container) return;

  const tagsHtml = (tags || []).map((tag, i) => `
    <span class="tag-item" data-note-id="${noteId}" data-tag-index="${i}">
      ${escapeHtml(tag)}
      <button class="tag-remove" onclick="removeTag('${noteId}', ${i})">×</button>
    </span>
  `).join('');

  container.innerHTML = `
    <div class="tags-manager">
      ${tagsHtml}
      <input type="text" class="tag-input" id="tag-input-${noteId}" 
             placeholder="输入标签后回车添加..." 
             onkeydown="handleEditorTagKeydown(event, '${noteId}')">
    </div>
  `;
}

function handleEditorTagKeydown(event, noteId) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    const input = document.getElementById(`tag-input-${noteId}`);
    const value = input ? input.value.trim().replace(/,$/, '') : '';
    if (value) {
      addTag(noteId, value);
      if (input) input.value = '';
    }
  }
}

function addTag(noteId, tag) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;

  notes[idx].tags = notes[idx].tags || [];
  if (!notes[idx].tags.includes(tag)) {
    if (notes[idx].tags.length >= 20) {
      showToast('标签最多20个', 'warning');
      return;
    }
    notes[idx].tags.push(tag);
    notes[idx].updatedAt = new Date().toISOString();
    setNotes(notes);
    renderTags(notes[idx].tags, noteId);
  }
}

function removeTag(noteId, index) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;

  notes[idx].tags.splice(index, 1);
  notes[idx].updatedAt = new Date().toISOString();
  setNotes(notes);
  renderTags(notes[idx].tags, noteId);
}

function checkForbiddenWords(text) {
  if (!text) return [];

  const words = getForbiddenWords();
  const matches = [];
  const lowerText = text.toLowerCase();

  words.forEach(word => {
    const lowerWord = word.toLowerCase();
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerWord, pos)) !== -1) {
      matches.push({
        word: word,
        position: pos
      });
      pos += lowerWord.length;
    }
  });

  const seen = new Set();
  return matches.filter(m => {
    if (seen.has(m.word)) return false;
    seen.add(m.word);
    return true;
  });
}

function runForbiddenCheck(noteId) {
  const resultEl = document.getElementById('forbidden-check-result');
  if (!resultEl) return;

  const contentEl = document.getElementById('editor-content');
  const titleEl = document.getElementById('editor-title');

  const content = contentEl ? contentEl.value : '';
  const title = titleEl ? titleEl.value : '';
  const fullText = title + '\n' + content;

  const matches = checkForbiddenWords(fullText);

  if (matches.length === 0) {
    resultEl.innerHTML = `
      <div class="forbidden-check-result forbidden-clean">
        ✅ 未检测到禁用词，内容合规！
      </div>
    `;
  } else {
    const wordsHtml = matches.map(m => `<span class="forbidden-word">${escapeHtml(m.word)}</span>`).join('');
    resultEl.innerHTML = `
      <div class="forbidden-check-result forbidden-found">
        ⚠️ 检测到 <strong>${matches.length}</strong> 个禁用词，请修改：${wordsHtml}
      </div>
    `;
  }
}

function saveCustomForbiddenWords() {
  const input = document.getElementById('forbidden-word-input');
  if (!input) return;

  const value = input.value.trim();
  const words = value
    .split(/[,，]/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  const unique = [...new Set(words)];
  setCustomForbiddenWords(unique);
  showToast(`已保存 ${unique.length} 个自定义禁用词`, 'success');
}

function saveEditorContent() {
  if (!currentSelectedNoteId) {
    showToast('请先选择或创建笔记', 'warning');
    return;
  }

  const titleEl = document.getElementById('editor-title');
  const contentEl = document.getElementById('editor-content');

  const title = titleEl ? titleEl.value.trim() : '';
  const content = contentEl ? contentEl.value : '';

  if (!title) {
    showToast('请输入笔记标题', 'warning');
    titleEl && titleEl.focus();
    return;
  }

  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === currentSelectedNoteId);
  if (idx === -1) {
    showToast('笔记不存在', 'error');
    return;
  }

  notes[idx].title = title;
  notes[idx].content = content;
  notes[idx].updatedAt = new Date().toISOString();
  setNotes(notes);
  renderNotesList();
  showToast('笔记保存成功', 'success');
}
