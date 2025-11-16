# JSONキーファイルについて

## JSONキーファイルとは

Google Cloud Consoleでサービスアカウントを作成した際にダウンロードしたJSONファイルです。

## ファイル名の例

通常、以下のような形式のファイル名です：
- `genbareport-478404-xxxxx.json`
- `genbareport-478404-xxxxx-xxxxx.json`

（`xxxxx`の部分はランダムな文字列）

## ファイルの内容

JSONファイルには以下のような情報が含まれています：

```json
{
  "type": "service_account",
  "project_id": "genbareport-478404",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "genbareport-service@genbareport-478404.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/genbareport-service%40genbareport-478404.iam.gserviceaccount.com"
}
```

## ダウンロード場所

通常、ブラウザのダウンロードフォルダに保存されます：
- Linux: `~/Downloads/`
- Windows: `C:\Users\ユーザー名\Downloads\`
- Mac: `~/Downloads/`

## サーバーへの配置方法

### 方法1: ファイルを直接アップロード

1. ダウンロードしたJSONファイルをサーバーにアップロード
2. 以下のコマンドで配置：

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
# アップロードしたファイルを server/keys/service-account-key.json にリネーム
mv /path/to/uploaded/file.json server/keys/service-account-key.json
chmod 600 server/keys/service-account-key.json
```

### 方法2: ファイルの内容をコピー＆ペースト

1. ダウンロードしたJSONファイルをテキストエディタで開く
2. 内容をすべてコピー
3. サーバーで以下を実行：

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
nano server/keys/service-account-key.json
# または
vi server/keys/service-account-key.json
```

4. コピーした内容を貼り付けて保存
5. 権限を設定：

```bash
chmod 600 server/keys/service-account-key.json
```

## 確認方法

JSONファイルが正しく配置されているか確認：

```bash
cd /home/itoshu3/apps/genbareport_app/genbareport
ls -la server/keys/service-account-key.json
cat server/keys/service-account-key.json | grep client_email
```

`client_email` に `genbareport-service@genbareport-478404.iam.gserviceaccount.com` が含まれていれば正しいです。

## 注意事項

- JSONキーファイルは機密情報です。Gitにコミットしないでください（`.gitignore`に含まれています）
- ファイルの権限は `600`（所有者のみ読み書き可能）に設定してください
- ファイルを共有したり、公開しないでください

