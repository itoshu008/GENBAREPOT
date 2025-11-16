# 本番環境URL

## 現場報告アプリ（genbareport）

### 直接アクセス（ポート指定）

**フロントエンド（SPA）:**
```
http://162.43.86.239:4100
```

**APIエンドポイント:**
```
http://162.43.86.239:4100/api/reports
http://162.43.86.239:4100/api/sheets
http://162.43.86.239:4100/api/masters/sites
http://162.43.86.239:4100/api/masters/staffs
http://162.43.86.239:4100/api/master/sheet-settings
http://162.43.86.239:4100/api/master/sites
```

### 主要ページ

- **スタッフページ**: `http://162.43.86.239:4100/staff`
- **チーフページ**: `http://162.43.86.239:4100/chief`
- **営業ページ**: `http://162.43.86.239:4100/sales`
- **経理ページ**: `http://162.43.86.239:4100/accounting`
- **報告書管理**: `http://162.43.86.239:4100/admin/reports`
- **マスター管理**: `http://162.43.86.239:4100/admin/master`

---

## 重要な注意事項

⚠️ **既存アプリとの区別**
- 既存の勤怠アプリ: `https://162.43.86.239` (ポート80/443)
- 現場報告アプリ: `http://162.43.86.239:4100` (ポート4100)

✅ **このアプリは独立しています**
- ポート4100のみを使用
- `genbareport_db` データベースのみを使用
- PM2プロセス名: `genbareport`

---

## Nginxリバースプロキシ設定（オプション）

もしNginxでリバースプロキシを設定する場合は、以下のような設定が可能です：

```nginx
# /etc/nginx/sites-available/genbareport
server {
    listen 80;
    server_name genbareport.example.com;  # または別のサブドメイン/IP

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**注意**: Nginxの設定は既存アプリに影響を与えないよう、別のサーバーブロックまたはサブドメインを使用してください。

---

## 動作確認

```bash
# ルートパス
curl http://162.43.86.239:4100

# APIエンドポイント
curl http://162.43.86.239:4100/api/reports
```

---

## セキュリティ

- ファイアウォールでポート4100が開いていることを確認してください
- HTTPS化する場合は、NginxでSSL証明書を設定してください
- 既存アプリと同様のセキュリティ設定を適用することを推奨します

