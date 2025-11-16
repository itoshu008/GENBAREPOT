-- sitesテーブルに日付カラムを追加
USE genbareport_db;

ALTER TABLE sites
ADD COLUMN date DATE DEFAULT NULL COMMENT '日付（スプレッドシートから同期した日付）';

-- インデックスを追加（日付での検索を高速化）
CREATE INDEX idx_date ON sites(date);

