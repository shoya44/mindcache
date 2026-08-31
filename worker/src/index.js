// worker/src/index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORSヘッダー設定
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://mindcache.pages.dev',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Key',
    };

    // プリフライトリクエスト
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 認証
    const syncKey = request.headers.get('X-Sync-Key');
    if (!syncKey) {
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Sync key required' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    try {
      // ===== 既存のルーティング =====
      
      // GET /api/memos
      if (path === '/api/memos' && method === 'GET') {
        const cursor = url.searchParams.get('cursor') || '0';
        const limit = 10;
        const stmt = env.DB.prepare(
          'SELECT * FROM memos WHERE sync_key = ? ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?'
        );
        const results = await stmt.bind(syncKey, limit, parseInt(cursor)).all();
        const nextCursor = results.results.length === limit ? (parseInt(cursor) + limit).toString() : null;
        return new Response(JSON.stringify({ memos: results.results, next_cursor: nextCursor }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // POST /api/memos
      if (path === '/api/memos' && method === 'POST') {
        const body = await request.json();
        const { title, content, is_pinned } = body;
        if (!content || content.trim() === '') {
          return new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Content is required' } }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        const id = crypto.randomUUID();
        const now = Date.now();
        const stmt = env.DB.prepare(
          'INSERT INTO memos (id, sync_key, title, content, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        await stmt.bind(id, syncKey, title || null, content, is_pinned ? 1 : 0, now, now).run();
        const memo = { id, title: title || null, content, is_pinned: is_pinned || false, created_at: now, updated_at: now };
        return new Response(JSON.stringify({ memo }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET /api/memos/:id
      const detailMatch = path.match(/^\/api\/memos\/([^/]+)$/);
      if (detailMatch && method === 'GET') {
        const id = detailMatch[1];
        const stmt = env.DB.prepare('SELECT * FROM memos WHERE id = ? AND sync_key = ?');
        const memo = await stmt.bind(id, syncKey).first();
        if (!memo) {
          return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Memo not found' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        const attStmt = env.DB.prepare('SELECT * FROM attachments WHERE memo_id = ?');
        const attachments = await attStmt.bind(id).all();
        return new Response(JSON.stringify({ memo, attachments: attachments.results }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // PUT /api/memos/:id
      if (detailMatch && method === 'PUT') {
        const id = detailMatch[1];
        const body = await request.json();
        const { title, content, is_pinned } = body;
        const now = Date.now();
        const stmt = env.DB.prepare(
          'UPDATE memos SET title = ?, content = ?, is_pinned = ?, updated_at = ? WHERE id = ? AND sync_key = ?'
        );
        await stmt.bind(title || null, content, is_pinned ? 1 : 0, now, id, syncKey).run();
        const getStmt = env.DB.prepare('SELECT * FROM memos WHERE id = ? AND sync_key = ?');
        const memo = await getStmt.bind(id, syncKey).first();
        return new Response(JSON.stringify({ memo }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // DELETE /api/memos/:id
      if (detailMatch && method === 'DELETE') {
        const id = detailMatch[1];
        const delStmt = env.DB.prepare('DELETE FROM memos WHERE id = ? AND sync_key = ?');
        await delStmt.bind(id, syncKey).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // ===== R2関連エンドポイント（追加） =====
      
      // POST /api/memos/:id/attachments
      const attachmentMatch = path.match(/^\/api\/memos\/([^/]+)\/attachments$/);
      if (attachmentMatch && method === 'POST') {
        const memoId = attachmentMatch[1];
        
        const memoStmt = env.DB.prepare('SELECT id FROM memos WHERE id = ? AND sync_key = ?');
        const memo = await memoStmt.bind(memoId, syncKey).first();
        if (!memo) {
          return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Memo not found' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const countStmt = env.DB.prepare('SELECT COUNT(*) as count FROM attachments WHERE memo_id = ?');
        const count = await countStmt.bind(memoId).first();
        if (count.count >= 10) {
          return new Response(JSON.stringify({ error: { code: 'LIMIT_EXCEEDED', message: 'Max 10 attachments per memo' } }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
          return new Response(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        const fileSize = arrayBuffer.byteLength;
        const fileName = file.name;
        const mimeType = file.type || 'application/octet-stream';
        const attachmentId = crypto.randomUUID();
        const r2Key = `uploads/${syncKey}/${memoId}/${attachmentId}_${fileName}`;

        await env.R2.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType: mimeType }
        });

        const now = Date.now();
        const insertStmt = env.DB.prepare(
          'INSERT INTO attachments (id, memo_id, filename, file_size, mime_type, r2_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        await insertStmt.bind(attachmentId, memoId, fileName, fileSize, mimeType, r2Key, now).run();

        const attachment = { id: attachmentId, memo_id: memoId, filename: fileName, file_size: fileSize, mime_type: mimeType, r2_key: r2Key, created_at: now };
        return new Response(JSON.stringify({ attachment }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET /api/attachments/:id/url
      const attUrlMatch = path.match(/^\/api\/attachments\/([^/]+)\/url$/);
      if (attUrlMatch && method === 'GET') {
        const attId = attUrlMatch[1];
        const stmt = env.DB.prepare('SELECT * FROM attachments WHERE id = ?');
        const attachment = await stmt.bind(attId).first();
        if (!attachment) {
          return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const url = await env.R2.createSignedUrl(attachment.r2_key, {
          expiresIn: 3600
        });

        return new Response(JSON.stringify({ url, expires_in: 3600 }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // DELETE /api/attachments/:id
      const attDeleteMatch = path.match(/^\/api\/attachments\/([^/]+)$/);
      if (attDeleteMatch && method === 'DELETE') {
        const attId = attDeleteMatch[1];
        const stmt = env.DB.prepare('SELECT r2_key FROM attachments WHERE id = ?');
        const attachment = await stmt.bind(attId).first();
        if (!attachment) {
          return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        await env.R2.delete(attachment.r2_key);
        await env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(attId).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 404
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: error.message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};