# API仕様書

## ベースURL

開発環境: `http://localhost:3001`

## エンドポイント

### 管理（Master）API

#### 1. シート設定を保存

**POST** `/api/master/sheet-settings/save`

GoogleスプレッドシートのURLと設定を保存します。

**リクエストボディ:**
```json
{
  "year": 2024,
  "month": 1,
  "sheet_url": "https://docs.google.com/spreadsheets/d/1AbCdEFghijkLmNOpQrstuVWxyz123456/edit#gid=0",
  "sheet_name": "シート1",  // 任意（指定なしなら最初のシートを使用）
  "range_a1": "A2:G500"      // 任意（デフォルト: A2:G500）
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Sheet settings saved",
  "data": { ... }
}
```

**エラー:**
- `400`: 必須パラメータが不足している、または無効なURL
- `500`: サーバーエラー

---

#### 2. サイトマスタをインポート

**POST** `/api/master/sites/import`

Googleスプレッドシートからサイトマスタを読み込んでデータベースに保存します。

**リクエストボディ:**
```json
{
  "year": 2024,
  "month": 1
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Sites imported successfully",
  "count": 150
}
```

**エラー:**
- `400`: 必須パラメータが不足している
- `404`: シート設定が見つからない
- `500`: サーバーエラー（Google Sheets APIエラー含む）

**処理内容:**
1. 指定された年・月のシート設定を取得
2. Google Sheets APIでデータを読み込み
3. 既存のサイトマスタ（同じ年・月）を削除
4. 新しいデータを挿入
5. Socket.IOで `master:siteImported` イベントを送信

---

#### 3. シート設定を取得

**GET** `/api/master/sheet-settings`

シート設定の一覧を取得します。

**クエリパラメータ:**
- `year` (任意): 年でフィルタ
- `month` (任意): 月でフィルタ

**例:**
```
GET /api/master/sheet-settings?year=2024&month=1
```

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2024,
      "month": 1,
      "sheet_url": "https://...",
      "sheet_id": "1AbCdEFghijkLmNOpQrstuVWxyz123456",
      "sheet_name": "シート1",
      "range_a1": "A2:G500",
      "last_imported_at": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

#### 4. サイトマスタ一覧を取得

**GET** `/api/master/sites`

指定された年・月のサイトマスタ一覧を取得します。

**クエリパラメータ:**
- `year` (必須): 年
- `month` (必須): 月

**例:**
```
GET /api/master/sites?year=2024&month=1
```

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2024,
      "month": 1,
      "site_code": "SITE001",
      "site_name": "現場A",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    ...
  ]
}
```

**エラー:**
- `400`: year または month が指定されていない

---

## Socket.IO イベント

### クライアント → サーバー

現在、特別なイベントはありません（接続のみ）。

### サーバー → クライアント

#### `master:siteImported`

サイトマスタがインポートされたときに送信されます。

**データ:**
```json
{
  "year": 2024,
  "month": 1
}
```

**使用例:**
```typescript
socket.on("master:siteImported", (data) => {
  console.log(`Sites imported for ${data.year}/${data.month}`);
  // サイトマスタ一覧を再取得
});
```

---

## データ形式

### Googleスプレッドシートの形式

サイトマスタとして読み込まれるシートは、以下の形式を想定しています：

| サイトコード | サイト名 | ... |
|------------|---------|-----|
| SITE001    | 現場A   | ... |
| SITE002    | 現場B   | ... |

- 1行目: ヘッダー（読み込まれません）
- 2行目以降: データ行
- 1列目: サイトコード
- 2列目: サイト名

範囲は `A2:G500` がデフォルトですが、`range_a1` で変更可能です。

