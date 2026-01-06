-- 0001_init.sql
-- M1：spaces / projects / tasks 最小闭环表结构 + 索引

-- 注意：schema_migrations 表建议由迁移执行器提前创建（这里也做兜底）。
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  project_id TEXT NULL,
  title TEXT NOT NULL,
  note TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done', 'archived')),
  priority INTEGER NULL,
  due_at INTEGER NULL,
  order_in_list INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  started_at INTEGER NULL,
  completed_at INTEGER NULL,
  timeline_edited_at INTEGER NULL,
  timeline_edit_reason TEXT NULL,
  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_space_id ON tasks(space_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);


