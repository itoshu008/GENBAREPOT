-- sheetsテーブルに座標情報カラムを追加
USE genbareport_db;

ALTER TABLE sheets
ADD COLUMN date_column VARCHAR(10) DEFAULT NULL COMMENT '日付の列（例: A）',
ADD COLUMN site_name_column VARCHAR(10) DEFAULT NULL COMMENT '現場名の列（例: B）',
ADD COLUMN location_column VARCHAR(10) DEFAULT NULL COMMENT '場所の列（例: C）',
ADD COLUMN staff_column VARCHAR(10) DEFAULT NULL COMMENT '担当者の列（例: D）',
ADD COLUMN start_row INT DEFAULT 2 COMMENT '開始行（例: 2）';

