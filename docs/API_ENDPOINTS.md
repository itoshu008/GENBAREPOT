# API エンドポイント一覧

**ベースURL**: `http://localhost:4100` (開発環境) / `http://162.43.86.239:4100` (本番環境)

**注意**: このアプリ専用のAPIです。他のアプリ（kintai、scheduleboardなど）には影響しません。

---

## 1. 報告書API (`/api/reports`)

### GET `/api/reports`
報告書一覧を取得（ロール別フィルタ対応）

**クエリパラメータ**:
- `role` (string, 任意): `staff` | `chief` | `sales` | `accounting`
- `date_from` (string, 任意): 開始日 (YYYY-MM-DD)
- `date_to` (string, 任意): 終了日 (YYYY-MM-DD)
- `site_code` (string, 任意): 現場コード（部分一致）
- `site_name` (string, 任意): 現場名（部分一致）
- `location` (string, 任意): 場所（部分一致）
- `chief_name` (string, 任意): チーフ名
- `status` (string, 任意): ステータス
- `staff_name` (string, 任意): スタッフ名（role=staffの場合）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "report_date": "2024-11-16",
      "site_id": 1,
      "site_code": "SITE001",
      "site_name": "現場名",
      "location": "場所",
      "chief_name": "チーフ名",
      "status": "staff_draft",
      ...
    }
  ]
}
```

---

### GET `/api/reports/:id`
報告書詳細を取得（スタッフエントリ・時間記録含む）

**パスパラメータ**:
- `id` (number): 報告書ID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_date": "2024-11-16",
    "site_id": 1,
    "site_code": "SITE001",
    "site_name": "現場名",
    "status": "staff_draft",
    "times": {
      "meeting_time": "08:00:00",
      "arrival_time": "09:00:00",
      "finish_time": "17:00:00",
      "departure_time": "18:00:00"
    },
    "staff_entries": [
      {
        "id": 1,
        "staff_name": "スタッフ名",
        "report_content": "報告内容",
        "is_warehouse": false,
        "is_selection": false,
        "is_driving": false
      }
    ]
  }
}
```

---

### POST `/api/reports`
報告書を作成

**リクエストボディ**:
```json
{
  "report_date": "2024-11-16",
  "site_id": 1,
  "site_code": "SITE001",
  "site_name": "現場名",
  "location": "場所",
  "staff_name": "スタッフ名",
  "report_content": "報告内容",
  "created_by": "スタッフ名"
}
```

**必須パラメータ**:
- `report_date`: 報告日 (YYYY-MM-DD)
- `site_id`: 現場ID
- `site_code`: 現場コード
- `site_name`: 現場名

**レスポンス**:
```json
{
  "success": true,
  "message": "Report created",
  "data": {
    "id": 1
  }
}
```

**リアルタイム更新**: `report:created` イベントを発行

---

### PUT `/api/reports/:id`
報告書を更新

**パスパラメータ**:
- `id` (number): 報告書ID

**リクエストボディ** (任意のフィールドを更新可能):
```json
{
  "site_id": 1,
  "site_code": "SITE001",
  "site_name": "現場名",
  "location": "場所",
  "chief_name": "チーフ名",
  "staff_report_content": "スタッフ報告内容",
  "chief_report_content": "チーフ報告内容",
  "sales_comment": "営業コメント",
  "accounting_comment": "経理コメント",
  "return_reason": "差戻し理由",
  "updated_by": "更新者名"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Report updated"
}
```

**リアルタイム更新**: `report:updated` イベントを発行

---

### POST `/api/reports/:id/status`
報告書のステータスを更新

**パスパラメータ**:
- `id` (number): 報告書ID

**リクエストボディ**:
```json
{
  "status": "staff_submitted",
  "return_reason": "差戻し理由（任意）",
  "updated_by": "更新者名"
}
```

**有効なステータス**:
- `staff_draft`: スタッフ記入中
- `staff_submitted`: スタッフがチーフへ提出
- `chief_submitted_to_sales`: チーフ→営業提出
- `returned_by_sales`: 営業差戻し
- `submitted_to_accounting`: 営業→経理提出
- `returned_by_accounting`: 経理差戻し
- `completed`: 完了

**レスポンス**:
```json
{
  "success": true,
  "message": "Status updated"
}
```

**リアルタイム更新**: `report:statusChanged` イベントを発行

---

### PUT `/api/reports/:id/times`
時間記録を更新

**パスパラメータ**:
- `id` (number): 報告書ID

**リクエストボディ**:
```json
{
  "meeting_time": "08:00",
  "arrival_time": "09:00",
  "finish_time": "17:00",
  "departure_time": "18:00"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Times updated"
}
```

---

### POST `/api/reports/:id/staff-entries`
スタッフエントリを追加・更新

**パスパラメータ**:
- `id` (number): 報告書ID

**リクエストボディ**:
```json
{
  "staff_name": "スタッフ名",
  "report_content": "報告内容",
  "is_warehouse": false,
  "is_selection": false,
  "is_driving": false
}
```

**必須パラメータ**:
- `staff_name`: スタッフ名

**レスポンス**:
```json
{
  "success": true,
  "message": "Staff entry updated"
}
```

**リアルタイム更新**: `report:staffUpdated` イベントを発行

---

### DELETE `/api/reports/:id/staff-entries/:entryId`
スタッフエントリを削除

**パスパラメータ**:
- `id` (number): 報告書ID
- `entryId` (number): スタッフエントリID

**レスポンス**:
```json
{
  "success": true,
  "message": "Staff entry deleted"
}
```

---

## 2. スプレッドシート管理API (`/api/sheets`)

### GET `/api/sheets`
スプレッドシートURL一覧を取得

**クエリパラメータ**:
- `type` (string, 任意): `sites` | `staffs` | `other`
- `year` (number, 任意): 対象年
- `month` (number, 任意): 対象月
- `is_active` (boolean, 任意): 有効/無効

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://docs.google.com/spreadsheets/d/...",
      "type": "sites",
      "target_year": 2024,
      "target_month": 11,
      "is_active": true,
      "last_synced_at": "2024-11-16T12:00:00Z"
    }
  ]
}
```

---

### POST `/api/sheets`
スプレッドシートURLを登録

**リクエストボディ**:
```json
{
  "url": "https://docs.google.com/spreadsheets/d/...",
  "type": "sites",
  "target_year": 2024,
  "target_month": 11,
  "is_active": true
}
```

**必須パラメータ**:
- `url`: スプレッドシートURL
- `type`: `sites` | `staffs` | `other`
- `target_year`: 対象年
- `target_month`: 対象月

**レスポンス**:
```json
{
  "success": true,
  "message": "Sheet URL registered",
  "data": {
    "id": 1
  }
}
```

---

### PUT `/api/sheets/:id`
スプレッドシートURLを更新

**パスパラメータ**:
- `id` (number): シートID

**リクエストボディ** (任意のフィールドを更新可能):
```json
{
  "url": "https://docs.google.com/spreadsheets/d/...",
  "type": "sites",
  "target_year": 2024,
  "target_month": 11,
  "is_active": true
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Sheet updated"
}
```

---

### DELETE `/api/sheets/:id`
スプレッドシートURLを削除

**パスパラメータ**:
- `id` (number): シートID

**レスポンス**:
```json
{
  "success": true,
  "message": "Sheet deleted"
}
```

---

### POST `/api/sheets/:id/sync`
CSV同期を実行

**パスパラメータ**:
- `id` (number): シートID

**レスポンス**:
```json
{
  "success": true,
  "message": "Sync completed",
  "data": {
    "count": 150
  }
}
```

**リアルタイム更新**: `sheet:synced` イベントを発行

---

## 3. マスターデータAPI (`/api/masters`)

### GET `/api/masters/sites`
現場マスタ一覧を取得

**クエリパラメータ**:
- `year` (number, 任意): 年
- `month` (number, 任意): 月
- `site_code` (string, 任意): 現場コード（部分一致）
- `site_name` (string, 任意): 現場名（部分一致）
- `location` (string, 任意): 場所（部分一致）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2024,
      "month": 11,
      "site_code": "SITE001",
      "site_name": "現場名",
      "location": "場所"
    }
  ]
}
```

---

### GET `/api/masters/staffs`
スタッフマスタ一覧を取得

**クエリパラメータ**:
- `year` (number, 任意): 年
- `month` (number, 任意): 月
- `staff_name` (string, 任意): スタッフ名（部分一致）
- `role` (string, 任意): `staff` | `chief` | `sales` | `accounting`

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2024,
      "month": 11,
      "staff_code": "STAFF001",
      "staff_name": "スタッフ名",
      "role": "staff"
    }
  ]
}
```

---

## 4. マスター管理API (`/api/master`) - 既存API

### POST `/api/master/sheet-settings/save`
シート設定を保存（既存API）

**リクエストボディ**:
```json
{
  "year": 2024,
  "month": 11,
  "sheet_url": "https://docs.google.com/spreadsheets/d/...",
  "sheet_name": "シート1",
  "range_a1": "A2:G500"
}
```

---

### POST `/api/master/sites/import`
サイトマスタをインポート（既存API）

**リクエストボディ**:
```json
{
  "year": 2024,
  "month": 11
}
```

**リアルタイム更新**: `master:siteImported` イベントを発行

---

### GET `/api/master/sheet-settings`
シート設定を取得（既存API）

**クエリパラメータ**:
- `year` (number, 任意)
- `month` (number, 任意)

---

### GET `/api/master/sites`
サイトマスタ一覧を取得（既存API）

**クエリパラメータ**:
- `year` (number, 必須)
- `month` (number, 必須)

---

## リアルタイム更新（Socket.IO）

### 接続
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:4100");
```

### イベント購読

#### 報告書の購読
```javascript
socket.emit("subscribe:report", reportId);
socket.on("report:updated", (data) => {
  // 報告書が更新された
});
socket.on("report:statusChanged", (data) => {
  // ステータスが変更された
});
socket.on("report:staffUpdated", (data) => {
  // スタッフエントリが更新された
});
```

#### ロール別の購読
```javascript
socket.emit("subscribe:role", "sales");
socket.on("report:statusChanged", (data) => {
  // 営業向けの更新を受信
});
```

### 発行されるイベント

- `report:created`: 報告書が作成された
- `report:updated`: 報告書が更新された
- `report:statusChanged`: ステータスが変更された
- `report:staffUpdated`: スタッフエントリが更新された
- `sheet:synced`: スプレッドシートが同期された
- `master:siteImported`: サイトマスタがインポートされた

---

## エラーレスポンス

すべてのAPIエンドポイントは、エラー時に以下の形式でレスポンスを返します：

```json
{
  "error": "エラーメッセージ"
}
```

**HTTPステータスコード**:
- `200`: 成功
- `400`: バリデーションエラー（必須パラメータ不足など）
- `404`: リソースが見つからない
- `500`: サーバーエラー

---

## データベース

**注意**: すべてのAPIは `genbareport_db` データベースのみを使用します。他のアプリのデータベースには一切影響しません。

**使用テーブル**:
- `reports`: 報告書メイン
- `report_times`: 時間記録
- `report_staff_entries`: スタッフエントリ
- `report_comments`: コメント・履歴
- `sheets`: スプレッドシートURL管理
- `sites`: 現場マスタ
- `staffs`: スタッフマスタ

