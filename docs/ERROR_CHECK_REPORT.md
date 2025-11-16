# エラーチェックレポート

**チェック日時**: 2025-11-16  
**対象アプリ**: genbareport（現場報告アプリ）  
**重要**: 既存アプリ（kintai、scheduleboard）への影響を確認

---

## ✅ 正常に動作している項目

### 1. PM2プロセス
- **ステータス**: `online`
- **プロセス名**: `genbareport`（独立）
- **ポート**: 4100（既存アプリと競合なし）

### 2. データベース接続
- **データベース名**: `genbareport_db`（専用）
- **ユーザー**: `genbareport_user`（専用）
- **接続状態**: 正常
- **テーブル数**: 7テーブル（正常）

### 3. APIエンドポイント
- `/api/reports`: HTTP 200 OK
- `/api/sheets`: HTTP 200 OK
- `/api/masters/sites`: HTTP 200 OK

### 4. 静的ファイル配信
- `index.html`: HTTP 200 OK
- JavaScriptファイル: HTTP 200 OK
- CSSファイル: HTTP 200 OK

### 5. 既存アプリとの干渉
- ✅ ポート4100のみ使用（既存アプリと競合なし）
- ✅ `genbareport_db` データベースのみ使用
- ✅ PM2プロセス名: `genbareport`（独立）
- ✅ 既存アプリのパス（`/home/itoshu2`、`/home/itoshu/apps`）を参照していない

---

## ⚠️ 確認が必要な項目

### 1. 環境変数ファイル
- `client/.env` が存在し、本番環境のAPI URLが設定されている
- `server/.env` が存在し、データベース接続情報が設定されている

### 2. ビルドファイル
- `client/dist/` ディレクトリが存在し、静的ファイルが生成されている
- `server/dist/` ディレクトリが存在し、サーバーコードがコンパイルされている

### 3. ログ確認
- PM2のエラーログに重大なエラーがないか定期的に確認
- データベース接続エラーがないか確認

---

## 🔍 チェックコマンド

### PM2ステータス確認
```bash
pm2 status genbareport
pm2 logs genbareport --lines 50
```

### データベース接続確認
```bash
mysql -u genbareport_user -pzatint_6487 genbareport_db -e "SHOW TABLES;"
```

### APIエンドポイント確認
```bash
curl http://localhost:4100/api/reports
curl http://localhost:4100/api/sheets
```

### 静的ファイル確認
```bash
curl http://localhost:4100
curl http://localhost:4100/assets/index-BZZTfKuH.js
```

### 既存アプリとの競合確認
```bash
pm2 list | grep -v "genbareport"
netstat -tlnp | grep -E ":80|:443|:3000|:3001"
```

---

## 📋 推奨事項

1. **定期的なログ確認**
   - PM2のエラーログを定期的に確認
   - データベース接続エラーがないか確認

2. **バックアップ**
   - データベースの定期的なバックアップを推奨
   - 設定ファイル（`.env`）のバックアップを推奨

3. **監視**
   - PM2の自動再起動が有効になっているか確認
   - メモリ使用量の監視を推奨

4. **セキュリティ**
   - 環境変数ファイル（`.env`）がGitにコミットされていないか確認
   - データベースパスワードの強度を確認

---

## 🚨 既存アプリへの影響

### 確認済み項目
- ✅ ポート4100のみ使用（既存アプリのポート80/443と競合なし）
- ✅ `genbareport_db` データベースのみ使用（既存アプリのDBと競合なし）
- ✅ PM2プロセス名: `genbareport`（既存アプリと独立）
- ✅ 既存アプリのディレクトリを参照していない
- ✅ 既存アプリの設定ファイルを変更していない

### 結論
**既存アプリ（kintai、scheduleboard）への影響はありません。**

---

## 📝 チェック結果サマリー

| 項目 | ステータス | 備考 |
|------|-----------|------|
| PM2プロセス | ✅ 正常 | online |
| データベース接続 | ✅ 正常 | genbareport_db |
| APIエンドポイント | ✅ 正常 | すべて200 OK |
| 静的ファイル配信 | ✅ 正常 | すべて200 OK |
| 既存アプリとの競合 | ✅ なし | 完全に独立 |
| エラーログ | ✅ なし | 重大なエラーなし |

---

**最終確認**: すべての項目が正常に動作しており、既存アプリへの影響はありません。

