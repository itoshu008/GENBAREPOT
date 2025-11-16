# APIエンドポイント HTTPステータスコード調査レポート

**調査日時**: 2025-11-16  
**ベースURL**: `http://localhost:4100`  
**注意**: このアプリ専用の調査です。他のアプリ（kintai、scheduleboardなど）には影響しません。

---

## 調査結果サマリー

### ✅ 正常に動作しているエンドポイント（200 OK）

#### フロントエンド（SPAルート）
- `GET /` → 200 OK
- `GET /staff` → 200 OK
- `GET /chief` → 200 OK
- `GET /sales` → 200 OK
- `GET /accounting` → 200 OK
- `GET /admin/reports` → 200 OK
- `GET /admin/master` → 200 OK

#### API GET エンドポイント
- `GET /api/reports` → 200 OK
- `GET /api/reports?role=staff` → 200 OK
- `GET /api/sheets` → 200 OK
- `GET /api/masters/sites` → 200 OK
- `GET /api/masters/staffs` → 200 OK

### ✅ 正常なエラーレスポンス

#### バリデーションエラー（400 Bad Request）
- `POST /api/reports` (空データ) → 400 OK
- `POST /api/sheets` (空データ) → 400 OK
- `POST /api/reports/1/status` (空データ) → 400 OK

#### リソース不存在（404 Not Found）
- `GET /api/reports/999` → 404 OK
- `GET /api/nonexistent` → 404 OK

### ⚠️ 修正が必要だったエンドポイント

#### 修正前（500 Internal Server Error）
- `GET /api/master/sheet-settings` → 500 (修正済み)
- `GET /api/master/sites?year=2024&month=11` → 500 (修正済み)

#### 修正内容
1. **テーブル名の不一致を修正**
   - `sheet_settings` → `sheets` テーブルを使用
   - `site_master` → `sites` テーブルを使用

2. **コードの修正箇所**
   - `server/src/routes/master.ts`:
     - `sheet_settings` テーブル参照を `sheets` に変更
     - `site_master` テーブル参照を `sites` に変更
     - URLからsheet_idを抽出する処理を追加

---

## データベーステーブル一覧

実際に存在するテーブル（`genbareport_db`）:
- `sheets` - スプレッドシートURL管理
- `sites` - 現場マスタ
- `staffs` - スタッフマスタ
- `reports` - 報告書メイン
- `report_times` - 時間記録
- `report_staff_entries` - スタッフエントリ
- `report_comments` - コメント・履歴

**注意**: `sheet_settings` と `site_master` テーブルは存在しません。

---

## テストスクリプト

`test_endpoints.sh` スクリプトを作成しました。以下のコマンドで全エンドポイントをテストできます：

```bash
./test_endpoints.sh
```

---

## 他のアプリへの影響確認

✅ **干渉なし**
- ポート4100のみを使用（既存アプリと競合なし）
- `genbareport_db` データベースのみを使用
- PM2プロセス名: `genbareport`（独立）
- 他のPM2プロセス（kintai、scheduleboard）は存在しないことを確認

---

## 現在の状態

- ✅ すべての主要エンドポイントが正常に動作
- ✅ エラーハンドリングが適切に実装されている
- ✅ データベーステーブル名の不一致を修正済み
- ✅ 他のアプリに干渉していない

