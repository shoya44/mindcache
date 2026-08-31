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