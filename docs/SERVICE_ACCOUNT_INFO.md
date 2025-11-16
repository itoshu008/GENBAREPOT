# サービスアカウント情報

## サービスアカウントのメールアドレス

```
genbareport-service@genbareport-478404.iam.gserviceaccount.com
```

## 次のステップ

### 1. JSONキーファイルの配置確認

JSONキーファイルを `server/keys/service-account-key.json` に配置してください。

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
# ダウンロードしたJSONファイルを server/keys/service-account-key.json に配置
chmod 600 server/keys/service-account-key.json
```

### 2. 環境変数の設定

`server/.env` ファイルを作成（または編集）して、以下を追加：

```env
GOOGLE_SHEETS_KEY_FILE=./keys/service-account-key.json
```

### 3. スプレッドシートの共有

以下のメールアドレスをスプレッドシートの共有リストに追加してください：

```
genbareport-service@genbareport-478404.iam.gserviceaccount.com
```

権限: **閲覧者**

### 4. アプリケーションの再起動

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
pm2 restart genbareport --update-env
```

## 確認方法

同期を実行して、エラーが発生しなければ設定完了です。

