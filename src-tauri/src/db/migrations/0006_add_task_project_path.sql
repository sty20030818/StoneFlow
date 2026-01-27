-- 0006_add_task_project_path.sql
-- 为 tasks 表添加 project_path 字段，用于存储本地项目物理路径

ALTER TABLE tasks ADD COLUMN project_path TEXT NULL;
