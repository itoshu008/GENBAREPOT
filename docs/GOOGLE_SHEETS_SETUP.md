# Google Sheets API 設定ガイド

サービスアカウント（zatgenba@gmail.comなど）を使って、非公開のスプレッドシートにもアクセスできるようにする設定方法です。

## 1. Google Cloud Console での設定

### プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）

### Google Sheets API の有効化
1. 「APIとサービス」→「ライブラリ」を開く
2. 「Google Sheets API」を検索
2. 「有効にする」をクリック

### サービスアカウントの作成
1. 「APIとサービス」→「認証情報」を開く
2. 「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウント名を入力（例: `genbareport-service`）
4. 「作成して続行」をクリック
5. ロールは「編集者」または「閲覧者」を選択（必要に応じて）
6. 「完了」をクリック

### JSONキーのダウンロード
1. 作成したサービスアカウントをクリック
2. 「キー」タブを開く
3. 「キーを追加」→「新しいキーを作成」を選択
4. 「JSON」を選択して「作成」をクリック
5. JSONファイルがダウンロードされます

## 2. サーバー側の設定

### JSONキーファイルの配置
1. ダウンロードしたJSONファイルを `server/keys/service-account-key.json` に配置
2. ファイルの権限を確認（読み取り可能であること）

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
mkdir -p server/keys
# JSONファイルを server/keys/service-account-key.json に配置
chmod 600 server/keys/service-account-key.json
```

### 環境変数の設定
`server/.env` ファイルに以下を追加：

```env
GOOGLE_SHEETS_KEY_FILE=./keys/service-account-key.json
```

または、絶対パスで指定：

```env
GOOGLE_SHEETS_KEY_FILE=/home/itoshu3/apps/genbareport_app/genbareport/server/keys/service-account-key.json
```

## 3. スプレッドシートの共有設定

サービスアカウントにスプレッドシートへのアクセス権限を付与する必要があります。

### 方法1: サービスアカウントに直接共有（推奨）

1. スプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力
   - JSONファイル内の `client_email` の値を確認（例: `genbareport-service@xxxxx.iam.gserviceaccount.com`）
4. 「閲覧者」権限を設定
5. 「送信」をクリック

**重要**: スプレッドシートを「リンクを知っている全員」に公開する必要はありません。サービスアカウントに直接共有すれば、非公開のままでもアクセスできます。

### 方法2: zatgenba@gmail.comで共有されているスプレッドシートの場合

もしスプレッドシートが既に `zatgenba@gmail.com` で共有されている場合でも、**サーバー側からのCSVエクスポートURLへのアクセスは認証情報がないため失敗します**。

解決策：
- **サービスアカウントを作成し、そのサービスアカウントにもスプレッドシートを共有してください**
- サービスアカウントは `zatgenba@gmail.com` とは別のアカウントですが、同じスプレッドシートにアクセスできます
- サービスアカウントのメールアドレス（例: `genbareport-service@xxxxx.iam.gserviceaccount.com`）をスプレッドシートの共有リストに追加してください

## 4. 動作確認

設定が完了したら、アプリケーションを再起動して同期を実行してください。

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
pm2 restart genbareport --update-env
```

## トラブルシューティング

### エラー: "Could not load the default credentials"
- `GOOGLE_SHEETS_KEY_FILE` 環境変数が正しく設定されているか確認
- JSONファイルのパスが正しいか確認
- JSONファイルが読み取り可能か確認

### エラー: "Permission denied"
- サービスアカウントにスプレッドシートへのアクセス権限が付与されているか確認
- サービスアカウントのメールアドレスが正しいか確認

### エラー: "API not enabled"
- Google Sheets APIが有効になっているか確認
- プロジェクトが正しく選択されているか確認

