-- 0004_add_project_priority.sql
-- 为 projects 表添加 priority 字段（P0-P3，默认 P1）

ALTER TABLE projects
ADD COLUMN priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3'));

UPDATE projects
SET priority = 'P1'
WHERE priority IS NULL OR priority = '';
