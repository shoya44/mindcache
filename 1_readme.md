# MindCache — 自分専用セカンドブレインPWA

MindCache は、「あれなんだっけ？」をワンタップで解決するための、自分専用の外部脳PWAです。
iPhone・PCどちらからでもアクセスでき、共有キー（パスフレーズ）でデータを同期します。

---

## 🚀 特徴

*   **📝 メモを即保存**：タイトル（任意）＋本文（必須）で、思いついたことをすぐに記録
*   **📌 ピン留め**：大事なメモは一覧上部に固定表示（📌マークではなく、カード左縁のグラデーションで視認）
*   **🔍 リアルタイム検索**：タイトル・本文を部分一致で即座にフィルタリング
*   **📎 ファイル添付（R2連携）**：画像・PDF・ソースコードなど、任意のファイルをメモに添付（1メモ最大10個）
*   **🔄 クラウド同期**：共有キー（任意のパスフレーズ）でiPhone・PC間でデータを自動同期
*   **📴 オフライン対応**：Service Workerによるキャッシュ表示＋オフライン編集・復帰時自動同期
*   **📤 データエクスポート/インポート**：全データをJSONでバックアップ・復元可能
*   **📱 PWA対応**：iPhoneのホーム画面に追加して、ネイティブアプリのように利用可能

---

## 🛠 技術スタック

| レイヤー | 技術 |
| :--- | :--- |
| **フロントエンド** | HTML5 + CSS3 + JavaScript（ES2024） |
| **PWA** | manifest.json + Service Worker |
| **バックエンドAPI** | Cloudflare Workers |
| **データベース** | Cloudflare D1（SQLite互換） |
| **ファイルストレージ** | Cloudflare R2（S3互換） |
| **ホスティング** | Cloudflare Pages |
| **認証** | 共有キー（パスフレーズ）方式 |

---

## 📁 プロジェクト構成

```text
mindcache/
├── frontend/                    # Cloudflare Pages デプロイ
│   ├── index.html               # メインHTML
│   ├── css/
│   │   └── style.css            # 全スタイル（Glassmorphism）
│   ├── js/
│   │   ├── app.js               # メインロジック
│   │   ├── api.js               # API通信層
│   │   └── db.js                # IndexedDB操作（オフライン用）
│   ├── manifest.json            # PWA設定
│   ├── sw.js                    # Service Worker
│   └── icons/                   # アプリアイコン（任意）
│       ├── icon-192.png
│       └── icon-512.png
├── worker/
│   └── src/
│       ├── index.js             # メインWorker（CRUD + R2連携）
│       └── cleanup.js           # クリーンアップWorker（Cron実行）
├── schema.sql                   # D1テーブル定義
├── wrangler.toml                # Cloudflare設定
└── README.md                    # 本ファイル
```

---

## 📋 機能一覧

| No. | 機能名 | 優先度 | 説明 |
| :--- | :--- | :---: | :--- |
| **F01** | メモ一覧表示 | 🔥 最優先 | メモをカード形式で一覧表示（最新10件＋ピン留め優先） |
| **F02** | メモ新規作成 | 🔥 最優先 | タイトル（任意）・本文（必須）を入力して新規メモを作成 |
| **F03** | メモ詳細表示 | 🔥 最優先 | メモの全文と添付ファイル一覧をモーダルで表示 |
| **F04** | メモ編集 | 🔥 最優先 | 既存メモのタイトル・本文・ピン留め状態を編集 |
| **F05** | メモ削除 | 🔥 最優先 | 確認ダイアログ表示後にメモを削除（添付ファイルも自動削除） |
| **F06** | メモ検索 | ⭐ 高 | タイトル＋本文を部分一致でリアルタイム検索 |
| **F07** | ピン留め | ⭐ 高 | メモをピン留め（一覧上部に固定表示） |
| **F08** | ページネーション | ⭐ 高 | 最新10件表示＋「もっと読み込む」で追加取得 |
| **F09** | 本文コピー | ⭐ 高 | メモ詳細画面から本文をワンタップでクリップボードにコピー |
| **F10** | クラウド同期 | ⭐ 高 | 共有キーによるデータ同期（Cloudflare経由） |
| **F11** | オフライン対応 | 🔵 中 | Service Workerによるキャッシュ表示＋オフライン編集 |
| **F12** | 添付ファイルアップロード | 🔵 中 | メモに画像・ファイルを添付（R2保存） |
| **F13** | 添付ファイルダウンロード | 🔵 中 | 添付ファイルをタップでダウンロード（署名付きURL） |
| **F14** | データエクスポート | 🔵 中 | 全データをJSON形式でダウンロード |
| **F15** | データインポート | 🔵 中 | JSONファイルからデータを復元（追加・上書き選択可） |
| **F16** | PWAインストール | 🔵 中 | ホーム画面に追加可能（manifest.json） |

---

## ⚙️ システム仕様

### 📡 APIエンドポイント一覧

| メソッド | パス | 機能 |
| :--- | :--- | :--- |
| `GET` | `/api/memos` | メモ一覧取得（ページネーション） |
| `POST` | `/api/memos` | 新規メモ作成 |
| `GET` | `/api/memos/:id` | メモ詳細取得（添付含む） |
| `PUT` | `/api/memos/:id` | メモ更新 |
| `DELETE` | `/api/memos/:id` | メモ削除（添付も自動削除） |
| `POST` | `/api/memos/:id/attachments` | 添付ファイルアップロード |
| `DELETE` | `/api/attachments/:id` | 添付ファイル単体削除 |
| `GET` | `/api/attachments/:id/url` | 署名付きダウンロードURL取得 |
| `GET` | `/api/export` | 全データエクスポート |
| `POST` | `/api/import` | データインポート |
| `GET` | `/api/storage/usage`| R2ストレージ使用量取得 |

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

### 2. D1データベース作成
```bash
wrangler d1 create mindcache-db
```
> 💡 出力された `database_id` を `wrangler.toml` に設定します。

### 3. スキーマ適用
```bash
wrangler d1 execute mindcache-db --file=schema.sql
```

### 4. R2バケット作成
```bash
wrangler r2 bucket create mindcache-attachments
```
> 💡 `wrangler.toml` にバケット名を設定します。

### 5. Workerデプロイ
```bash
# メインWorker
wrangler deploy

# クリーンアップWorker（Cron用）
wrangler deploy --name=mindcache-cleanup worker/src/cleanup.js
```

### 6. Pagesデプロイ
```bash
cd frontend
npx wrangler pages deploy . --project-name=mindcache
```

### 7. 環境変数設定
`frontend/js/api.js` の `API_BASE` をWorkerのURLに変更します。
```javascript
const API_BASE = 'https://mindcache-worker.xxxx.workers.dev';
```
**Pages再デプロイ：**
```bash
npx wrangler pages deploy . --project-name=mindcache
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
crons = ["0 2 * * *"]  # クリーンアップWorker用
```

---

## 📱 使い方・設定

### PWAインストール方法（ユーザー向け）
1. iPhoneのSafariで `https://mindcache.pages.dev` を開く
2. 下部の共有ボタン（□に↑のアイコン）をタップ
3. **「ホーム画面に追加」** をタップ
4. **「追加」** をタップ
5. ホーム画面から起動し、任意の同期キーを入力

### ⚠️ 利用制約

| 項目 | 制約値 |
| :--- | :--- |
| **1メモあたりの添付ファイル上限** | 10個 |
| **1ファイルあたり上限** | 無制限（自己責任） |
| **メモ本文最大文字数** | 100,000文字 |
| **R2自動削除開始閾値** | 9GB（保存容量） |
| **Workerリクエスト上限** | 10万リクエスト/日（Cloudflare無料枠） |

---

## 📝 ライセンス・謝辞

*   **ライセンス**: MIT License
*   **謝辞**:
    *   Cloudflare — Workers・D1・R2・Pages
    *   Lucide — アイコンセット

<p align="center">
  <i>Made with ☕️ and 🧠</i>
</p>
