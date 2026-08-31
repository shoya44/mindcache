mindcache/
├── frontend/                # Cloudflare Pages デプロイ
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   ├── db.js
│   │   └── ui.js
│   ├── manifest.json
│   └── sw.js
├── worker/                  # Cloudflare Workers デプロイ
│   └── src/
│       ├── cleanup.js.js
│       └── index.js
├── wrangler.toml            # Cloudflare 設定ファイル
└── schema.sql               # D1 テーブル定義