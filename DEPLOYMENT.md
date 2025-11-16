# デプロイ手順

## 前提条件

- Node.js がインストールされていること
- MySQL がインストールされていること
- PM2 がインストールされていること（`npm install -g pm2`）

## 1. データベースのセットアップ

### データベースとユーザーの作成

```bash
mysql -u root -p
```

MySQLに接続後、以下を実行：

```sql
CREATE DATABASE IF NOT EXISTS genbareport_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'genbareport_user'@'localhost' IDENTIFIED BY 'zatint_6487';
GRANT ALL PRIVILEGES ON genbareport_db.* TO 'genbareport_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### マイグレーションの実行

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
npm run migrate
```

または直接実行：

```bash
mysql -u genbareport_user -pzatint_6487 genbareport_db < server/database/migrations/001_initial_schema.sql
```

## 2. 環境変数の設定

### サーバー側

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport/server
cp .env.example .env
# .env を編集して必要な値を設定
```

**重要**: `.env` ファイルで以下を確認・設定してください：
- `PORT=4100`（本番環境）
- `CLIENT_URL`（本番環境のフロントエンドURL）
- データベース接続情報（genbareport_db専用）

### クライアント側（開発時のみ）

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport/client
# .env ファイルを作成（必要に応じて）
echo "VITE_API_URL=http://localhost:4100" > .env
```

## 3. 依存関係のインストール

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
npm install
```

## 4. ビルド

```bash
npm run build
```

これで以下がビルドされます：
- サーバー: `server/dist/`
- クライアント: `client/dist/`

## 5. PM2での起動

### 方法1: ecosystem.config.js を使用（推奨）

```bash
npm run pm2:start
```

または：

```bash
pm2 start ecosystem.config.js
```

### 方法2: 直接コマンドで起動

```bash
pm2 start npm --name genbareport -- run start
```

## 6. PM2の管理コマンド

```bash
# ステータス確認
pm2 status

# ログ確認
npm run pm2:logs
# または
pm2 logs genbareport

# 再起動（環境変数を更新する場合）
npm run pm2:restart
# または
pm2 restart genbareport --update-env

# 停止
npm run pm2:stop
# または
pm2 stop genbareport

# 削除
pm2 delete genbareport
```

## 7. 本番環境更新手順

### 通常の更新フロー

```bash
# 1. SSHで itoshu3 でログイン

# 2. リポジトリに移動
cd /home/itoshu3/apps/genbareport_app/genbareport

# 3. 最新のコードを取得
git pull origin main

# 4. 依存関係の更新（package.jsonが変更された場合のみ）
npm install

# 5. ビルド（コード変更があった場合）
npm run build

# 6. PM2で再起動
npm run pm2:restart
# または
pm2 restart genbareport --update-env
```

### データベースマイグレーションが必要な場合

```bash
# マイグレーション実行
npm run migrate
# または
mysql -u genbareport_user -pzatint_6487 genbareport_db < server/database/migrations/001_initial_schema.sql
```

## 8. 動作確認

- **バックエンドAPI**: http://localhost:4100/api
- **フロントエンド**: ビルド後の静的ファイルをNginxなどで配信

### ヘルスチェック

```bash
curl http://localhost:4100/api/reports
```

## 9. Nginx設定（参考）

Nginxからリバースプロキシする場合の設定例：

```nginx
# /etc/nginx/sites-available/genbareport など
server {
    listen 80;
    server_name genbareport.yourdomain.com;

    # フロントエンド（静的ファイル）
    location / {
        root /home/itoshu3/apps/genbareport_app/genbareport/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI
    location /api {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**注意**: このNginx設定は参考例です。実際の設定は既存のNginx設定に影響しないよう、別途手動で設定してください。

## 10. トラブルシューティング

### ポート4100が既に使用されている場合

```bash
# ポート使用状況確認
ss -tlnp | grep 4100
# または
netstat -tlnp | grep 4100

# 既存のプロセスを停止してから再起動
pm2 stop genbareport
pm2 start genbareport
```

### データベース接続エラー

- `.env` ファイルのデータベース接続情報を確認
- MySQLが起動しているか確認: `sudo systemctl status mysql`
- データベースとユーザーが正しく作成されているか確認

### PM2プロセスが起動しない

```bash
# ログを確認
pm2 logs genbareport

# エラーログを確認
cat logs/pm2-error.log
```

## 注意事項

- このアプリは `genbareport_db` 専用のデータベースを使用します
- 既存のアプリ（kintai、scheduleboardなど）とは完全に独立しています
- ポート4100を使用します（既存アプリと競合しません）
- PM2プロセス名は `genbareport` です（既存プロセスと競合しません）
