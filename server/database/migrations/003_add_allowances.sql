-- 手当カラムを追加（洗濯・仕切・宿泊）
-- 注意: 既にカラムが存在する場合はエラーになりますが、無視して問題ありません

ALTER TABLE report_staff_entries
ADD COLUMN is_laundry BOOLEAN DEFAULT FALSE COMMENT '洗濯',
ADD COLUMN is_partition BOOLEAN DEFAULT FALSE COMMENT '仕切',
ADD COLUMN is_accommodation BOOLEAN DEFAULT FALSE COMMENT '宿泊';

