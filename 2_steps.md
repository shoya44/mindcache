# 実装手順
## 1. Cloudflareセットアップ
###アカウント準備
- ログイン: https://dash.cloudflare.com/
- 左メニューから「Workers & Pages」→「Overview」
- 「Create application」→「Pages」→「Upload assets」※後で使う

### Wrangler CLI インストール(ブラウザが開き、Cloudflare連携。)
npm install -g wrangler
wrangler login

### プロジェクト初期化
cd C:\DEV
mkdir mindcache
cd mindcache
wrangler init --yes

╭ Create an application with Cloudflare Step 1 of 3
│
╰ In which directory do you want to create your application? also used as application name
  ./mindcache    ← ここに入力してEnter


## 2. D1 データベース作成
### DB作成
wrangler d1 create mindcache-db

✅ Successfully created DB 'mindcache-db' in region APAC
Created your new D1 database.

To access your new D1 Database in your Worker, add the following snippet to your configuration file:
{
  "d1_databases": [
    {
      "binding": "mindcache_db",
      "database_name": "mindcache-db",
      "database_id": "aba4fe27-1746-41c2-b96f-1b6f33bbc2c0"
    }
  ]
}

### wrangler.toml 作成, 配置 > "C:\DEV\mindcache\wrangler.toml"
### schema.sql 作成, 配置 > "C:\DEV\mindcache\schema.sql"
### D1 にスキーマ適用
wrangler d1 execute mindcache-db --file=schema.sql

### D1 設定確認
wrangler d1 execute mindcache-db --command="SELECT name FROM sqlite_master WHERE type='table';"
- memos: id(PK), sync_key, title, content, is_pinned, created_at, updated_at
  - INDEX: "sync_key", "updated_at DESC", "sync_key, is_pinned, updated_at DESC"
- attachments:id(PK), memo_id(FK, CASCADE), filename, file_size, mime_type, r2_key, created_at
  - INDEX: "memo_id"
- _cf_METADATA

## 3. Worker API 実装
### worker/src/index.js 作成
### Worker デプロイ
wrangler deploy
- Your Worker has access to the following bindings:
  - Binding                             Resource
  - env.DB (mindcache-db)               D1 Database
  - env.R2 (mindcache-attachments)      R2 Bucket

  - Uploaded mindcache-worker (4.47 sec)
  - Deployed mindcache-worker triggers (1.47 sec)
    - https://mindcache-worker.take503503.workers.dev
  - Current Version ID: 8e1d0bea-1c9b-4474-a4d4-a0db7375413b

## 4: フロントエンド実装（PWA）
### frontend/index.html 作成
### frontend/css/style.css 作成
### frontend/js/app.js 作成
### frontend/manifest.json 作成
### frontend/sw.js 作成

## 5: Cloudflare Pages デプロイ
### Pages にデプロイ（CLI）
- frontendディレクトリに移動
cd frontend

- Pagesにデプロイ（プロジェクト名は自由に設定）
npx wrangler pages deploy . --project-name=mindcache

√ The project you specified does not exist: "mindcache". Would you like to create it? » Create a new project
√ Enter the production branch name: ... production

✨ Deployment complete! Take a peek over at https://25c64c21.mindcache.pages.dev

### WorkerのCORS設定を更新
worker/src/index.js
'Access-Control-Allow-Origin': 'https://25c64c21.mindcache.pages.dev',

### Worker 再デプロイ
wrangler deploy

## 6: R2 バケット設定
### R2 バケット作成
wrangler r2 bucket create mindcache-attachments

### R2バケットの確認
wrangler r2 bucket list

name:           mindcache-attachments
creation_date:  2026-08-31T02:34:47.819Z

name:           yt-player-audio
creation_date:  2026-08-10T11:30:04.868Z

### wrangler.toml にR2バインディングを追加（確認）
[[r2_buckets]]
binding = "R2"
bucket_name = "mindcache-attachments"

## 7: WorkerにR2連携機能を追加
###worker/src/index.js を更新（R2関連エンドポイントを追加）

## 8:R2容量自動削除（Cron Worker）
### スケジュールドWorkerの追加(worker/src/cleanup.js)
### wrangler.toml にCron設定を追加
### クリーンアップWorker デプロイ
wrangler deploy --name=mindcache-cleanup worker/src/cleanup.js

## 9: フロントエンドのAPI URL設定
### frontend/js/api.js のAPI_BASEを更新
const API_BASE = 'https://mindcache-worker.take503503.workers.dev'; // デプロイ後、実際のWorker URLに置き換え

### Pages再デプロイ
cd frontend
npx wrangler pages deploy . --project-name=mindcache

✨ Deployment complete! Take a peek over at https://85486ccc.mindcache.pages.dev

