-- 0008_reset_task_model.sql
-- 任务数据模型重置：清空旧数据并重建 tasks 表结构（links/custom_fields 等新字段）

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS task_tags;
DROP TABLE IF EXISTS tasks;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  project_id TEXT NULL,
  title TEXT NOT NULL,
  note TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'done')),
  done_reason TEXT NULL CHECK (done_reason IN ('completed', 'cancelled') OR done_reason IS NULL),
  priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  rank INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER NULL,
  deadline_at INTEGER NULL,
  archived_at INTEGER NULL,
  deleted_at INTEGER NULL,
  links TEXT NULL,
  custom_fields TEXT NULL,
  create_by TEXT NOT NULL DEFAULT 'stonefish',
  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_space_id ON tasks(space_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline_at ON tasks(deadline_at);
CREATE INDEX IF NOT EXISTS idx_tasks_rank ON tasks(rank);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

PRAGMA foreign_keys = ON;
