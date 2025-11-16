# プロジェクト構造

現場報告アプリ（genbareport）のディレクトリ構造です。

## 📁 ディレクトリ構造

```
genbareport/
├── client/                 # フロントエンド（React + TypeScript + Vite）
│   ├── src/               # ソースコード
│   │   ├── pages/         # ページコンポーネント
│   │   ├── services/      # APIクライアント
│   │   ├── hooks/         # カスタムフック
│   │   └── ...
│   ├── dist/              # ビルド成果物（.gitignore）
│   └── package.json
│
├── server/                # バックエンド（Node.js + Express + TypeScript）
│   ├── src/               # ソースコード
│   │   ├── routes/        # APIルート
│   │   ├── services/      # ビジネスロジック
│   │   ├── database/      # データベース接続
│   │   ├── socket/        # Socket.IO設定
│   │   └── types/         # TypeScript型定義
│   ├── database/          # データベースマイグレーション
│   │   └── migrations/    # SQLマイグレーションファイル
│   ├── dist/              # ビルド成果物（.gitignore）
│   └── package.json
│
├── docs/                  # ドキュメント
│   ├── API_ENDPOINTS.md
│   ├── TROUBLESHOOTING.md
│   └── ...
│
├── scripts/               # スクリプト
│   └── test_endpoints.sh  # APIエンドポイントテストスクリプト
│
├── logs/                  # PM2ログ（.gitignore）
│
├── README.md              # プロジェクト概要
├── DEPLOYMENT.md          # デプロイ手順
├── PROJECT_STRUCTURE.md   # このファイル
├── package.json           # ルートパッケージ設定
├── ecosystem.config.js    # PM2設定
└── .gitignore

```

## 📝 主要ファイル

### ルートディレクトリ
- `README.md` - プロジェクト概要とセットアップ手順
- `DEPLOYMENT.md` - デプロイ手順
- `PROJECT_STRUCTURE.md` - このファイル（プロジェクト構造）
- `package.json` - ワークスペース設定
- `ecosystem.config.js` - PM2設定

### ドキュメント（docs/）
- `API_ENDPOINTS.md` - APIエンドポイント仕様
- `TROUBLESHOOTING.md` - トラブルシューティングガイド
- `PRODUCTION_URL.md` - 本番環境URL
- `ERROR_CHECK_SUMMARY.md` - エラーチェック結果

### スクリプト（scripts/）
- `test_endpoints.sh` - APIエンドポイントテストスクリプト

## 🔧 ビルド成果物

以下のディレクトリは `.gitignore` に含まれています：

- `client/dist/` - フロントエンドビルド成果物
- `server/dist/` - バックエンドビルド成果物
- `node_modules/` - 依存パッケージ
- `logs/` - PM2ログ

## 📦 依存関係

- **ルート**: `concurrently`（開発用）
- **クライアント**: React, TypeScript, Vite, React Router, Socket.IO Client, Axios
- **サーバー**: Express, TypeScript, Socket.IO, MySQL2, Google APIs, Axios

## 🚀 開発・デプロイ

詳細は `README.md` と `DEPLOYMENT.md` を参照してください。

