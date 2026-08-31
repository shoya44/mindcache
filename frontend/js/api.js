// frontend/js/api.js
const API_BASE = 'https://mindcache-worker.take503503.workers.dev'; // デプロイ後、実際のWorker URLに置き換え

export async function apiRequest(endpoint, options = {}) {
  const syncKey = localStorage.getItem('syncKey');
  if (!syncKey) throw new Error('SYNC_KEY_MISSING');

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': syncKey,
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'API Error');
  }
  return data;
}

// ファイルアップロード用（multipart/form-data のため Content-Type を固定しない）
async function apiRequestFormData(endpoint, formData) {
  const syncKey = localStorage.getItem('syncKey');
  if (!syncKey) throw new Error('SYNC_KEY_MISSING');

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'X-Sync-Key': syncKey },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'API Error');
  }
  return data;
}

export async function getMemos(cursor = '0') {
  return apiRequest(`/api/memos?cursor=${cursor}`);
}

export async function createMemo(title, content, isPinned = false) {
  return apiRequest('/api/memos', {
    method: 'POST',
    body: JSON.stringify({ title, content, is_pinned: isPinned }),
  });
}

export async function getMemo(id) {
  return apiRequest(`/api/memos/${id}`);
}

export async function updateMemo(id, title, content, isPinned) {
  return apiRequest(`/api/memos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content, is_pinned: isPinned }),
  });
}

export async function deleteMemo(id) {
  return apiRequest(`/api/memos/${id}`, {
    method: 'DELETE',
  });
}

// ===== 添付ファイル（F12/F13） =====
export async function uploadAttachment(memoId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequestFormData(`/api/memos/${memoId}/attachments`, formData);
}

export async function deleteAttachment(attachmentId) {
  return apiRequest(`/api/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

export async function getAttachmentUrl(attachmentId) {
  return apiRequest(`/api/attachments/${attachmentId}/url`);
}

// ダウンロード用エンドポイントは X-Sync-Key ヘッダー認証が必要なため、
// <a href> や window.open では認証情報を付与できない。
// fetch で取得してBlob URLを作り、それを疑似クリックでダウンロードさせる。
export async function downloadAttachment(attachmentId, filename) {
  const syncKey = localStorage.getItem('syncKey');
  if (!syncKey) throw new Error('SYNC_KEY_MISSING');

  const response = await fetch(`${API_BASE}/api/attachments/${attachmentId}/download`, {
    headers: { 'X-Sync-Key': syncKey },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Download failed');
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

// ===== データエクスポート/インポート（F14/F15） =====
export async function exportData() {
  return apiRequest('/api/export');
}

export async function importData(data, mode = 'append') {
  return apiRequest('/api/import', {
    method: 'POST',
    body: JSON.stringify({ data, mode }),
  });
}
