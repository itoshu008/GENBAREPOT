# Google Sheets API 有効化ガイド

## エラー内容

```
Google Sheets API has not been used in project 795184954954 before or it is disabled.
```

## 解決方法

### 1. Google Cloud Console でプロジェクトを確認

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（プロジェクトID: `795184954954` または `genbareport-478404`）

### 2. Google Sheets API を有効化

1. 「APIとサービス」→「ライブラリ」を開く
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### 3. プロジェクトIDの確認

サービスアカウントのJSONキーファイル内の `project_id` と、実際に使用しているプロジェクトIDが一致しているか確認してください。

- JSONファイル内の `project_id`: `genbareport-478404`
- エラーメッセージのプロジェクトID: `795184954954`

**もしプロジェクトIDが異なる場合**:
- 正しいプロジェクト（`genbareport-478404`）でGoogle Sheets APIを有効化する
- または、プロジェクトID `795184954954` のサービスアカウントを作成し直す

### 4. 有効化後の確認

APIを有効化した後、数分待ってから再度同期を実行してください。

## 直接リンク

プロジェクトID `795184954954` でAPIを有効化する場合：
https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=795184954954

