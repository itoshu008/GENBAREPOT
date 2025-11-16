# セットアップガイド

## 初回セットアップ手順

### 1. プロジェクトのクローンと依存関係のインストール

```bash
# 依存関係をインストール（ルート、サーバー、クライアント）
npm install
```

### 2. データベースのセットアップ

MySQLがインストールされていることを確認してください。

```bash
# データベースとテーブルを作成
mysql -u root -p < server/database/schema.sql
```

### 3. 環境変数の設定

#### サーバー側

```bash
cd server
cp .env.example .env
```

`server/.env` を編集して、データベース接続情報を設定してください。

```env
PORT=3001
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=genba_report
GOOGLE_SHEETS_KEY_FILE=./keys/service-account-key.json
```

#### クライアント側

```bash
cd client
cp .env.example .env
```

`client/.env` は通常、デフォルト値で問題ありません。

```env
VITE_API_URL=http://localhost:3001
```

### 4. Google Sheets API の設定

#### 4-1. Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」を開く
4. 「Google Sheets API」を検索して有効化
5. 「APIとサービス」→「認証情報」を開く
6. 「認証情報を作成」→「サービスアカウント」を選択
7. サービスアカウント名を入力（例: `genba-report-service`）
8. 「役割」は「編集者」または「閲覧者」を選択
9. 「完了」をクリック
10. 作成したサービスアカウントをクリック
11. 「キー」タブ→「キーを追加」→「JSONを作成」
12. JSONファイルがダウンロードされます

#### 4-2. サービスアカウントキーの配置

```bash
# server/keys ディレクトリを作成（存在しない場合）
mkdir -p server/keys

# ダウンロードしたJSONファイルを server/keys/service-account-key.json に配置
# Windowsの場合: エクスプローラーでコピー&ペースト
# Mac/Linuxの場合:
cp ~/Downloads/your-service-account-key.json server/keys/service-account-key.json
```

#### 4-3. スプレッドシートの共有設定

1. 読み取りたいGoogleスプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレス（JSONファイル内の `client_email` フィールド）を入力
4. 権限を「閲覧者」に設定
5. 「送信」をクリック

### 5. 開発サーバーの起動

```bash
# ルートディレクトリから
npm run dev
```

これで以下が起動します：
- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3001

### 6. 管理画面での設定

1. ブラウザで http://localhost:5173/admin/master にアクセス
2. 年・月を選択
3. GoogleスプレッドシートのURLを貼り付け
   - 例: `https://docs.google.com/spreadsheets/d/1AbCdEFghijkLmNOpQrstuVWxyz123456/edit#gid=0`
4. 「URLを保存」をクリック
5. 「取り込む」をクリックしてサイトマスタをインポート

## トラブルシューティング

### データベース接続エラー

- MySQLが起動しているか確認
- `server/.env` のデータベース接続情報が正しいか確認

### Google Sheets API エラー

- サービスアカウントキーファイルが正しい場所にあるか確認
- スプレッドシートがサービスアカウントに共有されているか確認
- Google Sheets APIが有効化されているか確認

### CORS エラー

- `server/.env` の `CLIENT_URL` が正しく設定されているか確認

