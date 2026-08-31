// frontend/js/app.js
import { getMemos, createMemo, getMemo, updateMemo, deleteMemo } from './api.js';

// ===== 状態 =====
let currentCursor = '0';
let editingMemoId = null; // null = 新規作成
let pendingFiles = []; // 作成/編集モーダルで選択中の未アップロードファイル
let allMemos = [];
let currentDetailMemo = null;

// ===== DOM参照 =====
const $ = (id) => document.getElementById(id);

const els = {
  searchToggle: $('searchToggle'),
  reloadBtn: $('reloadBtn'),
  searchContainer: document.querySelector('.search-container'),
  searchInput: $('searchInput'),
  pinnedSection: $('pinnedSection'),
  pinnedList: $('pinnedList'),
  memoList: $('memoList'),
  loadMoreBtn: $('loadMoreBtn'),
  fab: $('fab'),
  modalOverlay: $('modalOverlay'),
  modalBack: $('modalBack'),
  modalSave: $('modalSave'),
  modalTitle: $('modalTitle'),
  modalContent: $('modalContent'),
  pinToggle: $('pinToggle'),
  addFileBtn: $('addFileBtn'),
  attachmentList: $('attachmentList'),
  detailOverlay: $('detailOverlay'),
  detailClose: $('detailClose'),
  detailEdit: $('detailEdit'),
  detailDelete: $('detailDelete'),
  detailTitle: $('detailTitle'),
  detailMeta: $('detailMeta'),
  detailContent: $('detailContent'),
  detailCopy: $('detailCopy'),
  detailAttachmentList: $('detailAttachmentList'),
  toast: $('toast'),
  syncKeyOverlay: $('syncKeyOverlay'),
  syncKeyInput: $('syncKeyInput'),
  syncKeySubmit: $('syncKeySubmit'),
  confirmOverlay: $('confirmOverlay'),
  confirmCancel: $('confirmCancel'),
  confirmOk: $('confirmOk'),
};

// ===== 初期化 =====
init();

async function init() {
  bindEvents();
  await ensureSyncKey();
  await loadMemos({ reset: true });
}

// ===== Sync Key（画面内モーダルで入力。window.prompt はiOS PWAでメインスレッドをブロックし
//        フリーズを招くため使用しない） =====
function ensureSyncKey() {
  const existing = localStorage.getItem('syncKey');
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    els.syncKeyOverlay.style.display = 'flex';
    els.syncKeyInput.focus();

    const submit = () => {
      const value = els.syncKeyInput.value.trim();
      if (!value) return;
      localStorage.setItem('syncKey', value);
      els.syncKeyOverlay.style.display = 'none';
      els.syncKeySubmit.removeEventListener('click', submit);
      els.syncKeyInput.removeEventListener('keydown', onKeydown);
      resolve(value);
    };
    const onKeydown = (e) => {
      if (e.key === 'Enter') submit();
    };

    els.syncKeySubmit.addEventListener('click', submit);
    els.syncKeyInput.addEventListener('keydown', onKeydown);
  });
}

// ===== 削除確認（window.confirm の代わりに画面内モーダルを使用） =====
function confirmDialog() {
  return new Promise((resolve) => {
    els.confirmOverlay.style.display = 'flex';

    const cleanup = (result) => {
      els.confirmOverlay.style.display = 'none';
      els.confirmOk.removeEventListener('click', onOk);
      els.confirmCancel.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);

    els.confirmOk.addEventListener('click', onOk);
    els.confirmCancel.addEventListener('click', onCancel);
  });
}

// ===== イベント登録 =====
function bindEvents() {
  els.searchToggle.addEventListener('click', () => {
    els.searchContainer.classList.toggle('active');
    els.searchInput.focus();
  });

  els.reloadBtn.addEventListener('click', () => loadMemos({ reset: true }));

  els.searchInput.addEventListener('input', () => renderFilteredList());

  els.fab.addEventListener('click', () => openCreateModal());

  els.loadMoreBtn.addEventListener('click', () => loadMemos({ reset: false }));

  els.modalBack.addEventListener('click', closeEditModal);
  els.modalSave.addEventListener('click', saveMemo);
  els.pinToggle.addEventListener('click', () => {
    els.pinToggle.classList.toggle('active');
  });
  els.addFileBtn.addEventListener('click', pickFiles);

  els.detailClose.addEventListener('click', closeDetailModal);
  els.detailEdit.addEventListener('click', () => {
    if (currentDetailMemo) openEditModal(currentDetailMemo);
  });
  els.detailDelete.addEventListener('click', handleDelete);
  els.detailCopy.addEventListener('click', copyDetailContent);
}

// ===== データ取得・一覧描画 =====
async function loadMemos({ reset }) {
  try {
    if (reset) currentCursor = '0';
    const res = await getMemos(currentCursor);
    allMemos = reset ? res.memos : allMemos.concat(res.memos);
    currentCursor = res.next_cursor;
    els.loadMoreBtn.style.display = currentCursor ? 'block' : 'none';
    renderFilteredList();
  } catch (err) {
    await handleApiError(err);
  }
}

function renderFilteredList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filtered = query
    ? allMemos.filter(m =>
        (m.title || '').toLowerCase().includes(query) ||
        (m.content || '').toLowerCase().includes(query))
    : allMemos;

  const pinned = filtered.filter(m => m.is_pinned);
  const normal = filtered.filter(m => !m.is_pinned);

  els.pinnedSection.style.display = pinned.length ? 'block' : 'none';
  els.pinnedList.innerHTML = pinned.map(renderCard).join('');
  els.memoList.innerHTML = normal.map(renderCard).join('');

  document.querySelectorAll('.memo-card').forEach(card => {
    card.addEventListener('click', () => openDetailModal(card.dataset.id));
  });
}

function renderCard(memo) {
  const title = memo.title || 'Untitled';
  const titleClass = memo.title ? '' : 'empty';
  const preview = (memo.content || '').replace(/\n/g, ' ');
  return `
    <div class="memo-card ${memo.is_pinned ? 'pinned' : ''}" data-id="${memo.id}">
      <div class="card-title ${titleClass}">${escapeHtml(title)}</div>
      <div class="card-preview">${escapeHtml(preview)}</div>
      <div class="card-meta">${formatRelativeTime(memo.updated_at)}</div>
    </div>
  `;
}

// ===== 作成/編集モーダル =====
function openCreateModal() {
  editingMemoId = null;
  pendingFiles = [];
  els.modalTitle.value = '';
  els.modalContent.value = '';
  els.pinToggle.classList.remove('active');
  renderPendingAttachments();
  els.modalOverlay.style.display = 'flex';
}

function openEditModal(memo) {
  closeDetailModal();
  editingMemoId = memo.id;
  pendingFiles = [];
  els.modalTitle.value = memo.title || '';
  els.modalContent.value = memo.content || '';
  els.pinToggle.classList.toggle('active', !!memo.is_pinned);
  renderPendingAttachments();
  els.modalOverlay.style.display = 'flex';
}

function closeEditModal() {
  els.modalOverlay.style.display = 'none';
}

async function saveMemo() {
  const title = els.modalTitle.value.trim();
  const content = els.modalContent.value.trim();
  const isPinned = els.pinToggle.classList.contains('active');

  if (!content) {
    showToast('Content is required');
    return;
  }

  try {
    if (editingMemoId) {
      await updateMemo(editingMemoId, title || null, content, isPinned);
    } else {
      await createMemo(title || null, content, isPinned);
    }
    closeEditModal();
    await loadMemos({ reset: true });
    showToast('Saved!');
  } catch (err) {
    await handleApiError(err);
  }
}

function pickFiles() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.addEventListener('change', () => {
    pendingFiles = pendingFiles.concat(Array.from(input.files));
    renderPendingAttachments();
  });
  input.click();
}

function renderPendingAttachments() {
  els.attachmentList.innerHTML = pendingFiles.map((file, idx) => `
    <div class="attachment-item" data-idx="${idx}">
      <span>📎 ${escapeHtml(file.name)} ${formatFileSize(file.size)}</span>
      <span class="remove-attach" data-idx="${idx}">✕</span>
    </div>
  `).join('');

  els.attachmentList.querySelectorAll('.remove-attach').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.dataset.idx);
      pendingFiles.splice(idx, 1);
      renderPendingAttachments();
    });
  });
}

// ===== 詳細モーダル =====
async function openDetailModal(id) {
  try {
    const res = await getMemo(id);
    currentDetailMemo = res.memo;
    els.detailTitle.textContent = res.memo.title || 'Untitled';
    els.detailMeta.textContent = `Updated ${formatRelativeTime(res.memo.updated_at)}`;
    els.detailContent.textContent = res.memo.content || '';
    els.detailAttachmentList.innerHTML = (res.attachments || []).map(a => `
      <div class="attachment-item" data-id="${a.id}">📎 ${escapeHtml(a.filename)}</div>
    `).join('');
    els.detailOverlay.style.display = 'flex';
  } catch (err) {
    await handleApiError(err);
  }
}

function closeDetailModal() {
  els.detailOverlay.style.display = 'none';
  currentDetailMemo = null;
}

async function handleDelete() {
  if (!currentDetailMemo) return;
  const ok = await confirmDialog();
  if (!ok) return;
  try {
    await deleteMemo(currentDetailMemo.id);
    closeDetailModal();
    await loadMemos({ reset: true });
    showToast('Deleted');
  } catch (err) {
    await handleApiError(err);
  }
}

function copyDetailContent() {
  if (!currentDetailMemo) return;
  navigator.clipboard.writeText(currentDetailMemo.content || '')
    .then(() => showToast('Copied!'))
    .catch(() => showToast('Copy failed'));
}

// ===== 共通ユーティリティ =====
async function handleApiError(err) {
  if (err.message === 'SYNC_KEY_MISSING') {
    localStorage.removeItem('syncKey');
    await ensureSyncKey();
    return;
  }
  showToast(err.message || 'Error');
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  return `${week}w ago`;
}
