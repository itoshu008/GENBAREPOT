/**
 * PM2 エコシステム設定ファイル
 * 本番環境でのプロセス管理用
 * 
 * 使用方法:
 *   pm2 start ecosystem.config.js
 *   pm2 restart genbareport --update-env
 *   pm2 stop genbareport
 *   pm2 delete genbareport
 */

module.exports = {
  apps: [
    {
      name: "genbareport",
      script: "npm",
      args: "run start",
      cwd: "/home/itoshu3/apps/genbareport_app/genbareport",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4100,
        CLIENT_URL: "http://localhost:5173", // 本番環境のURLに変更してください
        DB_HOST: "localhost",
        DB_USER: "genbareport_user",
        DB_PASSWORD: "zatint_6487",
        DB_NAME: "genbareport_db",
        DB_PORT: 3306,
      },
      // ログ設定
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // 自動再起動設定
      watch: false,
      max_memory_restart: "500M",
      // クラッシュ時の自動再起動
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};

