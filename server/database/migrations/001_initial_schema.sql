-- 現場報告アプリ用データベーススキーマ
-- データベース名: genbareport_db
-- 注意: このアプリ専用のデータベースです。他のアプリのDBには影響しません。

CREATE DATABASE IF NOT EXISTS genbareport_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE genbareport_db;

-- スプレッドシートURL管理テーブル（複数URL対応）
CREATE TABLE IF NOT EXISTS sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'sites/staffs/other',
  target_year INT NOT NULL,
  target_month INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type_year_month (type, target_year, target_month),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 現場マスタテーブル
CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  site_code VARCHAR(50) NOT NULL,
  site_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) DEFAULT NULL COMMENT '場所',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_month (year, month),
  INDEX idx_site_code (site_code),
  UNIQUE KEY uniq_year_month_code (year, month, site_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- スタッフマスタテーブル
CREATE TABLE IF NOT EXISTS staffs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  staff_code VARCHAR(50) DEFAULT NULL,
  staff_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT NULL COMMENT 'staff/chief/sales/accounting',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_month (year, month),
  INDEX idx_name (staff_name),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 報告書メインテーブル
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL COMMENT '報告日',
  site_id INT NOT NULL COMMENT '現場ID（sites.id）',
  site_code VARCHAR(50) NOT NULL COMMENT '現場コード（検索用）',
  site_name VARCHAR(255) NOT NULL COMMENT '現場名',
  location VARCHAR(255) DEFAULT NULL COMMENT '場所',
  chief_name VARCHAR(100) DEFAULT NULL COMMENT 'チーフ氏名',
  status VARCHAR(50) NOT NULL DEFAULT 'staff_draft' COMMENT 'ステータス',
  staff_report_content TEXT DEFAULT NULL COMMENT 'スタッフ報告内容',
  chief_report_content TEXT DEFAULT NULL COMMENT 'チーフ報告内容',
  sales_comment TEXT DEFAULT NULL COMMENT '営業コメント',
  accounting_comment TEXT DEFAULT NULL COMMENT '経理コメント',
  return_reason TEXT DEFAULT NULL COMMENT '差戻し理由',
  created_by VARCHAR(100) DEFAULT NULL COMMENT '作成者',
  updated_by VARCHAR(100) DEFAULT NULL COMMENT '最終更新者',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_report_date (report_date),
  INDEX idx_site_id (site_id),
  INDEX idx_site_code (site_code),
  INDEX idx_status (status),
  INDEX idx_chief_name (chief_name),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 報告書時間記録テーブル
CREATE TABLE IF NOT EXISTS report_times (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL COMMENT '報告書ID（reports.id）',
  meeting_time TIME DEFAULT NULL COMMENT '集合時間',
  arrival_time TIME DEFAULT NULL COMMENT '現場到着',
  finish_time TIME DEFAULT NULL COMMENT '現場終了',
  departure_time TIME DEFAULT NULL COMMENT '現場出発',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_report_id (report_id),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- スタッフ報告エントリテーブル（1報告書に複数スタッフ）
CREATE TABLE IF NOT EXISTS report_staff_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL COMMENT '報告書ID（reports.id）',
  staff_name VARCHAR(100) NOT NULL COMMENT 'スタッフ氏名',
  report_content TEXT DEFAULT NULL COMMENT 'スタッフ報告内容',
  is_warehouse BOOLEAN DEFAULT FALSE COMMENT '倉庫',
  is_selection BOOLEAN DEFAULT FALSE COMMENT '選択',
  is_driving BOOLEAN DEFAULT FALSE COMMENT '運転',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_report_id (report_id),
  INDEX idx_staff_name (staff_name),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 報告書コメント・履歴テーブル
CREATE TABLE IF NOT EXISTS report_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL COMMENT '報告書ID（reports.id）',
  comment_type VARCHAR(50) NOT NULL COMMENT 'comment/return_reason/status_change',
  comment_text TEXT NOT NULL,
  created_by VARCHAR(100) NOT NULL COMMENT '作成者',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_id (report_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

