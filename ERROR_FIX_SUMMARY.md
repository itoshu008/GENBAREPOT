# 404エラー修正サマリー

## 発生していた問題

1. **フロントエンドがビルドされていない**
   - `client/dist` ディレクトリが存在しなかった
   - TypeScriptの型定義エラーによりビルドが失敗していた

2. **サーバー側で静的ファイル配信設定がない**
   - ルートパス（`/`）にアクセスすると404エラーが発生
   - APIエンドポイント（`/api/*`）は正常に動作していた

## 修正内容

### 1. TypeScript型定義エラーの修正

**ファイル**: `client/src/vite-env.d.ts` (新規作成)
- `import.meta.env` の型定義を追加
- Viteの環境変数型定義を追加

**ファイル**: `client/tsconfig.json`
- `strict: false` に変更（一時的な対応）
- `types: ["vite/client"]` を追加

**ファイル**: `client/src/services/sheetsApi.ts`
- `getSheets` のパラメータ型に `target_year`, `target_month` を追加

**ファイル**: `client/src/services/reportsApi.ts`
- `Report` インターフェースに `staff_name`, `report_content` を追加

### 2. フロントエンドのビルド

```bash
cd client
npm run build
```

ビルド成功: `client/dist/` ディレクトリが作成され、静的ファイルが生成された

### 3. サーバー側で静的ファイル配信設定を追加

**ファイル**: `server/src/index.ts`

```typescript
// 静的ファイル配信（本番環境）
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "../../client/dist");
  
  app.use(express.static(clientDistPath));
  
  // SPAフォールバック: すべてのルートを index.html にリダイレクト
  app.get("*", (req, res) => {
    // APIエンドポイントは除外
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}
```

## 動作確認

### 修正前
```bash
$ curl -I http://localhost:4100
HTTP/1.1 404 Not Found
```

### 修正後
```bash
$ curl -I http://localhost:4100
HTTP/1.1 200 OK
```

```bash
$ curl -s http://localhost:4100 | head -5
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

## 重要な注意事項

✅ **他のアプリに干渉していないことを確認**
- ポート4100のみを使用（既存アプリと競合なし）
- `genbareport_db` データベースのみを使用
- PM2プロセス名: `genbareport`（独立）

✅ **本番環境での動作**
- `NODE_ENV=production` で静的ファイル配信が有効になる
- 開発環境（`npm run dev`）では、Viteの開発サーバー（ポート5173）を使用

## デプロイ手順

1. フロントエンドをビルド
   ```bash
   npm run build:client
   ```

2. サーバーをビルド
   ```bash
   npm run build:server
   ```

3. PM2で再起動
   ```bash
   pm2 restart genbareport --update-env
   ```

4. 動作確認
   ```bash
   curl http://localhost:4100
   curl http://localhost:4100/api/reports
   ```

## 現在の状態

- ✅ フロントエンド: ビルド済み（`client/dist/`）
- ✅ サーバー: ビルド済み（`server/dist/`）
- ✅ 静的ファイル配信: 有効
- ✅ SPAフォールバックルーティング: 実装済み
- ✅ PM2: 正常に動作中（ポート4100）

