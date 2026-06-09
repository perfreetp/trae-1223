function showToast(message, type = 'success') {
  const existing = document.querySelector('.app-toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.className = 'app-toast-container';
  container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;';

  const colors = {
    success: '#52c41a',
    error: '#ff4d4f',
    warning: '#faad14',
    info: '#1890ff'
  };

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.style.cssText = `padding:12px 24px;background:${colors[type] || colors.success};color:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;animation:toastIn 0.3s ease;margin-bottom:8px;white-space:nowrap;`;
  toast.textContent = message;
  container.appendChild(toast);
  document.body.appendChild(container);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => {
      if (container.parentNode) container.remove();
    }, 300);
  }, 2500);

  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = '@keyframes toastIn { from { opacity:0; transform:translateY(-20px);} to {opacity:1; transform:translateY(0);} } @keyframes toastOut { from { opacity:1; transform:translateY(0);} to {opacity:0; transform:translateY(-20px);} }';
    document.head.appendChild(style);
  }
}

function showModal(title, contentHtml, footerHtml = '', options = {}) {
  const existing = document.getElementById('app-modal-overlay');
  if (existing) existing.remove();

  const { width = 480, closable = true, onClose = null } = options;

  const overlay = document.createElement('div');
  overlay.id = 'app-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99998;display:flex;align-items:center;justify-content:center;animation:modalFade 0.2s ease;';

  const modal = document.createElement('div');
  modal.className = 'app-modal';
  modal.style.cssText = `background:#fff;border-radius:12px;width:${width}px;max-width:90vw;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.2);animation:modalIn 0.25s ease;`;

  const header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size:16px;font-weight:600;color:#333;';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  if (closable) {
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = 'cursor:pointer;font-size:22px;color:#999;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:all 0.2s;';
    closeBtn.onmouseenter = () => { closeBtn.style.background = '#f5f5f5'; closeBtn.style.color = '#666'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#999'; };
    closeBtn.onclick = () => closeModal();
    header.appendChild(closeBtn);
  }
  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'app-modal-body';
  body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;';
  body.innerHTML = contentHtml;
  modal.appendChild(body);

  if (footerHtml) {
    const footer = document.createElement('div');
    footer.className = 'app-modal-footer';
    footer.style.cssText = 'padding:12px 20px;border-top:1px solid #f0f0f0;display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0;';
    footer.innerHTML = footerHtml;
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  if (closable) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = '@keyframes modalFade { from {opacity:0;} to {opacity:1;} } @keyframes modalIn { from {opacity:0; transform:scale(0.95) translateY(-10px);} to {opacity:1; transform:scale(1) translateY(0);} }';
    document.head.appendChild(style);
  }

  return overlay;
}

function closeModal() {
  const overlay = document.getElementById('app-modal-overlay');
  if (overlay) {
    const modal = overlay.querySelector('.app-modal');
    if (modal) {
      modal.style.animation = 'modalIn 0.2s ease reverse forwards';
    }
    overlay.style.animation = 'modalFade 0.15s ease reverse forwards';
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 180);
    return;
  }

  const container = document.getElementById('modal-container');
  if (container) {
    const modalOverlay = container.querySelector('.modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.opacity = '0';
      modalOverlay.style.transition = 'opacity 0.15s';
      setTimeout(() => {
        container.innerHTML = '';
      }, 150);
    } else {
      container.innerHTML = '';
    }
  }
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

function formatDateTime(date) {
  return formatDate(date, 'YYYY-MM-DD HH:mm');
}

function getWeekDates(baseDate) {
  const base = new Date(baseDate || new Date());
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(monday.getDate() + diff);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isSameDay(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function getInitials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed.charAt(trimmed.length - 1);
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return trimmed.charAt(0).toUpperCase();
}

function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  } catch (e) {
    return false;
  }
}

function downloadFile(content, filename, type = 'text/plain') {
  let blob;
  if (typeof content === 'object' && content instanceof Blob) {
    blob = content;
  } else if (typeof content === 'object') {
    blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  } else {
    blob = new Blob([content], { type });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function rateTitle(title) {
  if (!title) return 0;
  let score = 0;
  const t = String(title).trim();
  const len = t.length;

  if (len >= 8 && len <= 25) score += 2;
  else if (len >= 4 && len < 8) score += 1;
  else if (len > 25 && len <= 35) score += 1;

  const hotKeywords = ['必看', '必入', '必学', '推荐', '分享', '攻略', '教程', '技巧', '方法', '干货', '秘密', '真相', '绝了', '神仙', '宝藏', '安利', '种草', '踩雷', '避坑', '测评', '对比', '平价', '平价替代', '学生党', '保姆级', '零基础', '新手', '小白', '懒人', '救星', '神器'];
  hotKeywords.forEach(kw => {
    if (t.includes(kw)) score += 1;
  });
  score = Math.min(score, 3);

  const emotionKeywords = ['太绝了', '超级', '巨好', '超爱', '哭了', '吹爆', '封神', 'yyds', '永远的神', '绝绝子', '真的', '一定要', '亲测', '实测', '亲身'];
  emotionKeywords.forEach(kw => {
    if (t.includes(kw)) score += 0.5;
  });
  score = Math.min(score, 4);

  if (/\d/.test(t)) score += 1;
  if (/[0-9]+[%个款步骤方面招技巧方法]/.test(t)) score += 1;

  const questions = ['?', '？', '如何', '怎么', '怎样', '什么', '为什么', '哪个', '哪里', '吗', '呢'];
  let hasQuestion = false;
  questions.forEach(q => {
    if (t.includes(q)) hasQuestion = true;
  });
  if (hasQuestion) score += 0.5;

  if (/:|：/.test(t)) score += 0.5;
  if (/[「」《》【】]/.test(t)) score += 0.5;

  score = Math.max(1, Math.min(10, Math.round(score)));
  return score;
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatNumber(num) {
  const n = Number(num) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function confirmDialog(message, onConfirm, onCancel) {
  const contentHtml = `
    <div style="padding: 8px 0; font-size: 14px; line-height: 1.7; color: #333;">
      ${escapeHtml(message)}
    </div>
  `;
  const footerHtml = `
    <button class="btn-secondary" onclick="closeModal(); ${onCancel ? '(' + onCancel.toString() + ')()' : ''}">取消</button>
    <button class="btn-primary" onclick="closeModal(); (${onConfirm.toString()})();">确定</button>
  `;
  showModal('确认操作', contentHtml, footerHtml, { width: 420 });
}

function openModal(html, afterRender) {
  const container = document.getElementById('modal-container');
  if (!container) return;
  container.innerHTML = html;
  if (typeof afterRender === 'function') {
    setTimeout(afterRender, 0);
  }
}

function closeModalOnBackdrop(event) {
  if (event.target.classList.contains('modal-overlay')) {
    const overlay = event.target;
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s';
    setTimeout(() => {
      const container = document.getElementById('modal-container');
      if (container) container.innerHTML = '';
    }, 150);
  }
}
