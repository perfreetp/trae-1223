document.addEventListener('DOMContentLoaded', function() {
  initNavigation();
  initData();
  renderAllModules();
  updateStorageCount();
});

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const module = this.dataset.module;
      switchModule(module);
    });
  });
}

function switchModule(moduleName) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.module === moduleName);
  });
  document.querySelectorAll('.module').forEach(mod => {
    mod.classList.toggle('active', mod.id === `module-${moduleName}`);
  });

  if (moduleName === 'topics') {
    renderTopics(StorageManager.getTopics());
    renderTopicStats();
  } else if (moduleName === 'editor') {
    renderNotesList();
    renderTopicSelectOptions();
  } else if (moduleName === 'schedule') {
    renderAccountFilter();
    renderSchedule();
  } else if (moduleName === 'interaction') {
    renderInteractionStats();
    renderInteractionContent();
  } else if (moduleName === 'competitors') {
    renderCompetitors(StorageManager.getCompetitors());
    renderCompetitorStats();
  } else if (moduleName === 'review') {
    renderTemplateFilters();
    renderReview();
  } else if (moduleName === 'team') {
    renderTeamView();
  }
}

function initData() {
  if (!localStorage.getItem('xhs_initialized_v5')) {
    localStorage.clear();
    StorageManager.initMockData();
    localStorage.setItem('xhs_initialized_v5', 'true');
  }
}

function renderAllModules() {
  renderTopics(StorageManager.getTopics());
  renderTopicStats();
  renderNotesList();
  renderTopicSelectOptions();
  renderAccountFilter();
  renderSchedule();
  renderInteractionStats();
  renderInteractionContent();
  renderCompetitors(StorageManager.getCompetitors());
  renderCompetitorStats();
  renderTemplateFilters();
  renderReview();
}

function updateStorageCount() {
  const topics = StorageManager.getTopics().length;
  const notes = StorageManager.getNotes().length;
  const schedules = StorageManager.getSchedules().length;
  const interactions = StorageManager.getInteractions().length;
  const competitors = StorageManager.getCompetitors().length;
  const templates = StorageManager.getTemplates().length;
  const total = topics + notes + schedules + interactions + competitors + templates;
  
  const countEl = document.getElementById('storage-count');
  if (countEl) {
    countEl.textContent = `${total} 条数据`;
  }
}

function exportAllData() {
  const data = StorageManager.exportAllData();
  const jsonStr = JSON.stringify(data, null, 2);
  const filename = `xhs-ops-backup-${formatDate(new Date(), 'YYYYMMDD')}.json`;
  downloadFile(jsonStr, filename, 'application/json');
  showToast('数据导出成功！', 'success');
}

function importAllData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const success = StorageManager.importAllData(data);
      if (success) {
        localStorage.setItem('xhs_initialized_v2', 'true');
        renderAllModules();
        updateStorageCount();
        showToast('数据导入成功！', 'success');
      } else {
        showToast('导入失败：无效的数据格式', 'error');
      }
    } catch (err) {
      showToast('导入失败：文件格式错误', 'error');
      console.error(err);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
