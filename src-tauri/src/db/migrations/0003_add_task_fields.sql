-- 0003_add_task_fields.sql
-- 为 tasks 表添加缺失字段：note, priority, planned_start_at, planned_end_at

-- 添加 note 字段
ALTER TABLE tasks ADD COLUMN note TEXT NULL;

-- 添加 priority 字段（P0-P3，默认 P1）
ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3'));

-- 添加计划时间字段
ALTER TABLE tasks ADD COLUMN planned_start_at INTEGER NULL;
ALTER TABLE tasks ADD COLUMN planned_end_at INTEGER NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_end_at ON tasks(planned_end_at);
