# トラブルシューティングガイド

## サイトに表示が出ない場合の確認事項

### 1. サーバーの起動確認

```bash
pm2 status genbareport
pm2 logs genbareport --lines 20
```

### 2. 静的ファイルの確認

```bash
# ルートパス
curl http://localhost:4100

# JavaScriptファイル
curl http://localhost:4100/assets/index-D0BIAquj.js

# CSSファイル
curl http://localhost:4100/assets/index-BhlO4fuz.css
```

### 3. APIエンドポイントの確認

```bash
curl http://localhost:4100/api/reports
```

### 4. ブラウザの開発者ツールで確認

1. **F12キー**で開発者ツールを開く
2. **Consoleタブ**でエラーを確認
3. **Networkタブ**でリクエストの状態を確認
   - `/assets/index-D0BIAquj.js` が200で返っているか
   - `/api/reports` が200で返っているか

### 5. よくあるエラーと対処法

#### CORSエラー
- サーバーのCORS設定を確認
- `server/src/index.ts` の `cors` 設定を確認

#### 404エラー（静的ファイル）
- `client/dist/` ディレクトリが存在するか確認
- ビルドが正しく実行されたか確認: `npm run build`

#### API接続エラー
- フロントエンドのAPI URL設定を確認
- `client/src/services/api.ts` の `API_URL` を確認
- 本番環境では `VITE_API_URL` 環境変数を設定

### 6. 本番環境での確認

```bash
# 外部からアクセス可能か確認
curl http://162.43.86.239:4100

# ファイアウォール設定を確認
sudo ufw status
```

### 7. 環境変数の確認

```bash
# サーバー側
cat server/.env

# クライアント側（ビルド時に使用）
cat client/.env
```

### 8. 再ビルドと再デプロイ

```bash
# フロントエンドを再ビルド
npm run build:client

# サーバーを再ビルド
npm run build:server

# PM2で再起動
pm2 restart genbareport --update-env
```

---

## 現在の設定

- **ポート**: 4100
- **静的ファイルパス**: `/home/itoshu3/apps/genbareport_app/genbareport/client/dist`
- **データベース**: `genbareport_db`
- **PM2プロセス名**: `genbareport`

---

## 他のアプリへの影響

✅ **このアプリは完全に独立しています**
- ポート4100のみを使用（既存アプリと競合なし）
- `genbareport_db` データベースのみを使用
- PM2プロセス名: `genbareport`（独立）

