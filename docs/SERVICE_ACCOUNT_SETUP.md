# サービスアカウント設定手順（簡易版）

## 1. Google Cloud Console でサービスアカウントを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「ライブラリ」
4. 「Google Sheets API」を検索して「有効にする」
5. 「APIとサービス」→「認証情報」
6. 「認証情報を作成」→「サービスアカウント」を選択
7. サービスアカウント名を入力（例: `genbareport-service`）
8. 「作成して続行」→「完了」
9. 作成したサービスアカウントをクリック
10. 「キー」タブ→「キーを追加」→「新しいキーを作成」
11. 「JSON」を選択→「作成」
12. JSONファイルがダウンロードされます

## 2. JSONキーファイルをサーバーに配置

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
mkdir -p server/keys
# ダウンロードしたJSONファイルを server/keys/service-account-key.json に配置
chmod 600 server/keys/service-account-key.json
```

## 3. 環境変数を設定

`server/.env` ファイルに以下を追加（ファイルが存在しない場合は作成）：

```env
GOOGLE_SHEETS_KEY_FILE=./keys/service-account-key.json
```

または、絶対パスで指定：

```env
GOOGLE_SHEETS_KEY_FILE=/home/itoshu3/apps/genbareport_app/genbareport/server/keys/service-account-key.json
```

## 4. スプレッドシートをサービスアカウントと共有

1. スプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力
   - ダウンロードしたJSONファイルを開いて `client_email` の値を確認
   - 例: `genbareport-service@xxxxx.iam.gserviceaccount.com`
4. 「閲覧者」権限を設定
5. 「送信」をクリック

## 5. アプリケーションを再起動

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
pm2 restart genbareport --update-env
```

## 確認方法

同期を実行して、エラーが発生しなければ設定完了です。

