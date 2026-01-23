-- 0002_projects_and_activity.sql
-- 扩展数据模型：projects / tags / task_tags / activity_logs + 为 tasks 添加 project_id 列

-- Project：阶段容器（支持树结构）
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  parent_id TEXT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER NULL,
  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (parent_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_space_id ON projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_id);
CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);

-- Tag：辅助维度
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Task 与 Tag 多对多
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- ActivityLog：行为日志
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'task' | 'project'
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- 为 tasks 表添加 project_id 列（用于挂载到 Project 上）
ALTER TABLE tasks ADD COLUMN project_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

