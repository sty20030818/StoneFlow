-- 添加 planned_end_date 字段（截止日期，时间戳毫秒）
ALTER TABLE tasks ADD COLUMN planned_end_date INTEGER;
