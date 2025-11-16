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
mysql -u genbareport_user -pzatint_6487 genbareport_db < server/database/migrations/001_initial_schema.sql
```

## 2. 環境変数の設定

### サーバー側

```bash
cd server
cp .env.example .env
# .env を編集して必要な値を設定
```

### クライアント側

```bash
cd client
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

## 5. PM2での起動

```bash
pm2 start npm --name genbareport -- run start
```

または、環境変数を指定する場合：

```bash
pm2 start npm --name genbareport -- run start --update-env
```

## 6. PM2の管理コマンド

```bash
# ステータス確認
pm2 status

# ログ確認
pm2 logs genbareport

# 再起動
pm2 restart genbareport --update-env

# 停止
pm2 stop genbareport

# 削除
pm2 delete genbareport
```

## 7. 動作確認

- フロントエンド: http://localhost:5173（開発時）またはビルド後の静的ファイル
- バックエンドAPI: http://localhost:4100/api

## 注意事項

- このアプリは `genbareport_db` 専用のデータベースを使用します
- 既存のアプリ（kintai、scheduleboardなど）とは完全に独立しています
- ポート4100を使用します（既存アプリと競合しません）

