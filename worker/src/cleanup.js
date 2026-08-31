// worker/src/cleanup.js
export default {
  async scheduled(event, env, ctx) {
    // 毎日深夜2時に実行
    const LIMIT_BYTES = 9 * 1024 * 1024 * 1024; // 9GB
    const TARGET_BYTES = 8 * 1024 * 1024 * 1024; // 8GB

    // R2使用量取得
    let totalSize = 0;
    const objects = await env.R2.list();
    for (const obj of objects.objects) {
      totalSize += obj.size;
    }

    if (totalSize <= LIMIT_BYTES) {
      console.log(`Usage: ${totalSize} / ${LIMIT_BYTES} - OK`);
      return;
    }

    console.log(`Usage exceeded: ${totalSize}. Cleaning...`);

    // 古い添付ファイルを取得
    const stmt = env.DB.prepare(
      'SELECT * FROM attachments ORDER BY created_at ASC'
    );
    const attachments = await stmt.all();

    let freed = 0;
    for (const att of attachments.results) {
      if (totalSize - freed <= TARGET_BYTES) break;

      // R2から削除
      await env.R2.delete(att.r2_key);
      // DBから削除
      await env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(att.id).run();

      freed += att.file_size;
      console.log(`Deleted: ${att.filename} (${att.file_size} bytes)`);
    }

    console.log(`Cleaned ${freed} bytes. New total: ${totalSize - freed}`);
  }
};