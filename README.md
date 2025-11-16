# 現場報告アプリ

現場報告を管理するアプリケーションです。

## 技術スタック

### フロントエンド
- React + TypeScript + Vite
- React Router

### バックエンド
- Node.js + Express (TypeScript)
- Socket.IO
- Google Sheets API

### データベース
- MySQL

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

#### サーバー側（server/.env）

`server/.env.example` をコピーして `server/.env` を作成し、値を設定してください。

```bash
cd server
cp .env.example .env
```

必要な環境変数：
```
PORT=4100
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_USER=genbareport_user
DB_PASSWORD=zatint_6487
DB_NAME=genbareport_db
DB_PORT=3306
GOOGLE_SHEETS_KEY_FILE=./keys/service-account-key.json
```

**重要**: `server/keys/` ディレクトリを作成してください（.gitignoreに含まれています）。

#### クライアント側（client/.env）

`client/.env.example` をコピーして `client/.env` を作成してください。

```bash
cd client
cp .env.example .env
```

```
VITE_API_URL=http://localhost:4100
```

### 3. Google Sheets API サービスアカウント

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」から「Google Sheets API」を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」を選択
5. サービスアカウントを作成し、JSONキーをダウンロード
6. ダウンロードしたJSONファイルを `server/keys/service-account-key.json` に配置
7. スプレッドシートを開き、「共有」ボタンをクリック
8. サービスアカウントのメールアドレス（JSONファイル内の `client_email`）を「閲覧者」として追加

### 4. データベースのセットアップ

```bash
mysql -u root -p < server/database/schema.sql
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:4100

## デプロイ

VPS（Node.js + MySQL）へのデプロイを前提としています。

### 本番環境での起動

**PM2を使用した起動（推奨）:**

```bash
# 初回起動
npm run pm2:start
# または
pm2 start ecosystem.config.js

# 再起動
npm run pm2:restart
# または
pm2 restart genbareport --update-env
```

**ポート**: 4100（既存アプリと競合しません）

**データベース**: genbareport_db（専用データベース）

詳細なデプロイ手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### リアルタイム更新機能

このアプリは Socket.IO を使用してリアルタイム更新を実現しています：

- 報告書の作成・更新・ステータス変更が即座に反映されます
- 複数のクライアント（スタッフのスマホ、営業のPCなど）が同じ報告書を見ていても、状態変更がリアルタイムに同期されます

**注意**: 本番環境のURLは、デプロイ後に適切なドメインまたはIPアドレスを設定してください。既存のアプリケーションと干渉しないよう、別のポート番号またはサブドメインを使用することを推奨します。

