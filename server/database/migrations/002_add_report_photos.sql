-- 報告書写真テーブル
CREATE TABLE IF NOT EXISTS report_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL COMMENT '報告書ID（reports.id）',
  file_name VARCHAR(255) NOT NULL COMMENT 'ファイル名',
  file_path VARCHAR(500) NOT NULL COMMENT 'ファイルパス',
  file_size INT DEFAULT NULL COMMENT 'ファイルサイズ（バイト）',
  mime_type VARCHAR(100) DEFAULT NULL COMMENT 'MIMEタイプ',
  uploaded_by VARCHAR(100) DEFAULT NULL COMMENT 'アップロード者',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL COMMENT '有効期限（1週間後）',
  INDEX idx_report_id (report_id),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

