-- メモテーブル
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  sync_key TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memos_sync_key ON memos(sync_key);
CREATE INDEX IF NOT EXISTS idx_memos_updated ON memos(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos(sync_key, is_pinned, updated_at DESC);

-- 添付ファイルテーブル
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_memo_id ON attachments(memo_id);