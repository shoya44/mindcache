# MindCache — 自分専用セカンドブレインPWA

MindCache は、「あれなんだっけ？」をワンタップで解決するための、自分専用の外部脳PWAです。
iPhone・PCどちらからでもアクセスでき、共有キー（パスフレーズ）でデータを同期します。

本番環境: https://mindcache.pages.dev

---

## 🚀 特徴

*   **📝 メモを即保存**：タイトル（任意）＋本文（必須）で、思いついたことをすぐに記録
*   **📌 ピン留め**：大事なメモは一覧上部に固定表示（カード左縁のグラデーションで視認）
*   **🔍 リアルタイム検索**：タイトル・本文を部分一致で即座にフィルタリング
*   **📎 ファイル添付（R2連携）**：メモに画像・ファイルを添付・ダウンロード（1メモ最大10個）
*   **🔄 クラウド同期**：共有キー（任意のパスフレーズ）でiPhone・PC間でデータを自動同期
*   **📤 データエクスポート/インポート**：全データをJSONでバックアップ・復元可能
*   **📱 PWA対応**：iPhoneのホーム画面に追加して、ネイティブアプリのように利用可能

> オフライン編集（未実装）以外の全機能を実装済み。詳細は「実装状況」参照。

---

## 🛠 技術スタック

| レイヤー | 技術 |
| :--- | :--- |
| **フロントエンド** | HTML5 + CSS3 + JavaScript（ES2024、フレームワーク不使用） |
| **PWA** | manifest.json + Service Worker |
| **バックエンドAPI** | Cloudflare Workers |
| **データベース** | Cloudflare D1（SQLite互換） |
| **ファイルストレージ** | Cloudflare R2（S3互換、APIのみ実装済み・フロント未連携） |
| **ホスティング** | Cloudflare Pages |
| **認証** | 共有キー（パスフレーズ）方式（ヘッダー `X-Sync-Key`） |

---

## 📁 プロジェクト構成

```text
mindcache/
├── frontend/                    # Cloudflare Pages デプロイ対象
│   ├── index.html               # メインHTML
│   ├── css/
│   │   └── style.css            # 全スタイル（Glassmorphism）
│   ├── js/
│   │   ├── app.js               # メインロジック（UI制御・状態管理）
│   │   └── api.js               # API通信層（Worker呼び出し）
│   ├── manifest.json            # PWA設定
│   └── sw.js                    # Service Worker（キャッシュ）
├── worker/
│   └── src/
│       ├── index.js             # メインWorker（CRUD + R2連携API）
│       └── cleanup.js           # クリーンアップWorker（Cron実行、単独デプロイ）
├── schema.sql                   # D1テーブル定義
├── wrangler.toml                # Cloudflare設定（メインWorker用）
├── 1_readme.md                  # 本ファイル
├── 2_steps.md                   # 構築手順の実行ログ
├── 3_directory.md                # D1テーブル構成メモ
└── 4_spec.md                    # 仕様書（v1.0、将来機能含む）
```

`frontend/icons/`（PWAアイコン）は`manifest.json`が参照しているが未配置。ホーム画面追加時のアイコン表示に影響する。

---

## 📋 機能一覧・実装状況

| No. | 機能名 | 優先度 | 実装状況 |
| :--- | :--- | :---: | :--- |
| F01 | メモ一覧表示 | 🔥 最優先 | ✅ 実装済み |
| F02 | メモ新規作成 | 🔥 最優先 | ✅ 実装済み |
| F03 | メモ詳細表示 | 🔥 最優先 | ✅ 実装済み |
| F04 | メモ編集 | 🔥 最優先 | ✅ 実装済み |
| F05 | メモ削除 | 🔥 最優先 | ✅ 実装済み（確認は画面内モーダル） |
| F06 | メモ検索 | ⭐ 高 | ✅ 実装済み |
| F07 | ピン留め | ⭐ 高 | ✅ 実装済み |
| F08 | ページネーション | ⭐ 高 | ✅ 実装済み |
| F09 | 本文コピー | ⭐ 高 | ✅ 実装済み |
| F10 | クラウド同期 | ⭐ 高 | ✅ 実装済み |
| F11 | オフライン対応 | 🔵 中 | ⚠️ Service Workerの静的キャッシュのみ。オフライン編集・自動再同期は未実装 |
| F12 | 添付ファイルアップロード | 🔵 中 | ✅ 実装済み（保存済み添付の個別削除UIは未実装） |
| F13 | 添付ファイルダウンロード | 🔵 中 | ✅ 実装済み（Worker経由、fetch+Blob URL方式） |
| F14 | データエクスポート | 🔵 中 | ✅ 実装済み |
| F15 | データインポート | 🔵 中 | ✅ 実装済み（append/overwrite選択可） |
| F16 | PWAインストール | 🔵 中 | ✅ 実装済み（アイコン画像は要配置） |

---

## ⚙️ システム仕様

### 📡 APIエンドポイント一覧

| メソッド | パス | 機能 | フロント連携 |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/memos` | メモ一覧取得（ページネーション） | ✅ |
| `POST` | `/api/memos` | 新規メモ作成 | ✅ |
| `GET` | `/api/memos/:id` | メモ詳細取得（添付含む） | ✅ |
| `PUT` | `/api/memos/:id` | メモ更新 | ✅ |
| `DELETE` | `/api/memos/:id` | メモ削除（添付も自動削除） | ✅ |
| `POST` | `/api/memos/:id/attachments` | 添付ファイルアップロード | ✅ |
| `DELETE` | `/api/attachments/:id` | 添付ファイル単体削除 | ⚠️ API関数のみ用意、UI未接続 |
| `GET` | `/api/attachments/:id/url` | ダウンロードURL取得（`/download`への相対リンクを返す） | ✅ |
| `GET` | `/api/attachments/:id/download` | 添付ファイル実体のダウンロード（`X-Sync-Key`必須） | ✅ |
| `GET` | `/api/export` | 全データエクスポート | ✅ |
| `POST` | `/api/import` | データインポート | ✅ |
| `GET` | `/api/storage/usage`| R2ストレージ使用量取得 | ❌ 未実装（Worker側にもエンドポイントなし） |

### 🗄 データベーススキーマ

#### `memos` テーブル
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | UUID |
| `sync_key` | TEXT | 共有キー（ユーザー識別子） |
| `title` | TEXT | メモタイトル（任意） |
| `content` | TEXT | メモ本文（必須） |
| `is_pinned` | INTEGER | ピン留めフラグ（0/1） |
| `created_at` | INTEGER | 作成日時（Unix ms） |
| `updated_at` | INTEGER | 更新日時（Unix ms） |

#### `attachments` テーブル
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | UUID |
| `memo_id` | TEXT (FK) | 紐づくメモのID |
| `filename` | TEXT | 元のファイル名 |
| `file_size` | INTEGER | ファイルサイズ（バイト） |
| `mime_type` | TEXT | MIMEタイプ |
| `r2_key` | TEXT | R2バケット内のキー |
| `created_at` | INTEGER | アップロード日時（Unix ms） |

---

## 🚀 デプロイ手順（開発者向け）

### 前提条件
*   Cloudflareアカウント
*   Wrangler CLI がインストール済み
*   Node.js（v18以上）

### 1. プロジェクト初期化
```bash
git clone <your-repo-url> mindcache
cd mindcache
wrangler login
```

### 2. D1データベース作成・スキーマ適用
```bash
wrangler d1 create mindcache-db
# 出力された database_id を wrangler.toml に設定
wrangler d1 execute mindcache-db --file=schema.sql --remote
```

### 3. R2バケット作成
```bash
wrangler r2 bucket create mindcache-attachments
# wrangler.toml にバケット名を設定
```

### 4. Workerデプロイ
```bash
# メインWorker
wrangler deploy

# クリーンアップWorker（Cron用）
wrangler deploy --name=mindcache-cleanup worker/src/cleanup.js
```

### 5. フロントエンドAPI URL設定
`frontend/js/api.js` の `API_BASE` をWorkerのURLに変更します。
```javascript
const API_BASE = 'https://mindcache-worker.xxxx.workers.dev';
```

### 6. WorkerのCORS設定
`worker/src/index.js` の `Access-Control-Allow-Origin` を、実際にアクセスするPages本番ドメインに合わせます。

> ⚠️ Cloudflare Pagesはブランチ単位でデプロイが分かれる（例: `main`ブランチ→`main.<project>.pages.dev`、`production`ブランチ→本番ドメイン`<project>.pages.dev`）。本番ドメインに反映するには`--branch=production`を明示すること。省略するとGitのカレントブランチ名でデプロイされ、本番ドメインに反映されない。

### 7. Pagesデプロイ
```bash
cd frontend
npx wrangler pages deploy . --project-name=mindcache --branch=production
```

---

## 🔧 環境変数（`wrangler.toml`）

```toml
name = "mindcache-worker"
main = "worker/src/index.js"
compatibility_date = "2024-09-01"

[[d1_databases]]
binding = "DB"
database_name = "mindcache-db"
database_id = "xxxx-xxxx-xxxx-xxxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "mindcache-attachments"

[triggers]
crons = ["0 2 * * *"]  # クリーンアップWorker用（cleanup.js を個別デプロイして利用）
```

---

## 📱 使い方（ユーザー向け）

### PWAインストール方法
1. iPhoneのSafariで本番URLを開く
2. 下部の共有ボタン（□に↑のアイコン）をタップ
3. **「ホーム画面に追加」** をタップ
4. **「追加」** をタップ
5. ホーム画面から起動し、任意の同期キーを入力（画面内モーダルで入力。ブラウザのネイティブダイアログ`window.prompt`は使用しない）

### ⚠️ 利用制約

| 項目 | 制約値 |
| :--- | :--- |
| **1メモあたりの添付ファイル上限** | 10個（Worker API側のみ、フロント未連携） |
| **メモ本文最大文字数** | 100,000文字（D1のSQLite制限に準拠、フロント側バリデーションは未実装） |
| **R2自動削除開始閾値** | 9GB（保存容量、`cleanup.js`による） |
| **Workerリクエスト上限** | 10万リクエスト/日（Cloudflare無料枠） |

---

## 🐛 既知の注意点

*   `window.prompt` / `window.confirm` はメインスレッドをブロックするネイティブダイアログで、PWA（ホーム画面起動時のstandalone表示）環境ではフリーズや無反応を引き起こすことが確認されている。本プロジェクトでは同期キー入力・削除確認ともに画面内モーダル（Promiseベース）で実装している。新規実装時も`window.prompt`/`window.confirm`/`window.alert`は使用しないこと。
*   Cloudflare Pagesはブランチ単位でデプロイが分離される。本番ドメインへ反映する際は必ず`--branch=production`を指定すること。

---

## 📝 ライセンス・謝辞

*   **ライセンス**: MIT License
*   **謝辞**:
    *   Cloudflare — Workers・D1・R2・Pages

<p align="center">
  <i>Made with ☕️ and 🧠</i>
</p>
