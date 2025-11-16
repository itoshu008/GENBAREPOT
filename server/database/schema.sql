CREATE DATABASE IF NOT EXISTS genba_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE genba_report;

-- シート設定テーブル
CREATE TABLE IF NOT EXISTS sheet_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  sheet_url TEXT NOT NULL,
  sheet_id VARCHAR(255) DEFAULT NULL,
  sheet_name VARCHAR(255) DEFAULT NULL,
  range_a1 VARCHAR(100) DEFAULT NULL,
  last_imported_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- サイトマスタテーブル
CREATE TABLE IF NOT EXISTS site_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  site_code VARCHAR(50) NOT NULL,
  site_name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_month (year, month),
  INDEX idx_site_code (site_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 報告書テーブル（既存の仕様に基づく）
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  site_code VARCHAR(50) NOT NULL,
  staff_name VARCHAR(100) DEFAULT NULL,
  chief_name VARCHAR(100) DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  content TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_month_site (year, month, site_code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

