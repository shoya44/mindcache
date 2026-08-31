mindcache/
├── .gitignore               # .wrangler/ など（Cloudflareアカウント情報を含むキャッシュ）を除外
├── frontend/                # Cloudflare Pages デプロイ
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js           # メインロジック（UI制御・状態管理）
│   │   └── api.js           # API通信層（Worker呼び出し）
│   ├── manifest.json
│   └── sw.js
├── worker/                  # Cloudflare Workers デプロイ
│   └── src/
│       ├── cleanup.js       # クリーンアップWorker（Cron、単独デプロイ）
│       └── index.js         # メインWorker（CRUD + R2連携 + export/import）
├── wrangler.toml            # Cloudflare 設定ファイル（メインWorker用）
└── schema.sql                # D1 テーブル定義
