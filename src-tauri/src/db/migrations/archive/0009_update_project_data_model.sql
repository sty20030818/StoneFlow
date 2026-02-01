-- 0009_update_project_data_model.sql
-- Project 数据模型重构 + Tags/Links 统一模型 + rank 默认值调整

PRAGMA foreign_keys = OFF;

ALTER TABLE projects RENAME TO projects_old;
ALTER TABLE tags RENAME TO tags_old;
ALTER TABLE task_tags RENAME TO task_tags_old;
ALTER TABLE tasks RENAME TO tasks_old;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  parent_id TEXT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NULL,
  priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  todo_task_count INTEGER NOT NULL DEFAULT 0,
  done_task_count INTEGER NOT NULL DEFAULT 0,
  last_task_updated_at INTEGER NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER NULL,
  deleted_at INTEGER NULL,
  create_by TEXT NOT NULL DEFAULT 'stonefish',
  rank INTEGER NOT NULL DEFAULT 1024,
  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (parent_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_space_id ON projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_id);
CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
CREATE INDEX IF NOT EXISTS idx_projects_rank ON projects(rank);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  project_id TEXT NULL,
  title TEXT NOT NULL,
  note TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'done')),
  done_reason TEXT NULL CHECK (done_reason IN ('completed', 'cancelled') OR done_reason IS NULL),
  priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  rank INTEGER NOT NULL DEFAULT 1024,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER NULL,
  deadline_at INTEGER NULL,
  archived_at INTEGER NULL,
  deleted_at INTEGER NULL,
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

CREATE TABLE IF NOT EXISTS project_tags (
  project_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (project_id, tag_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('doc', 'repoLocal', 'repoRemote', 'web', 'design', 'other')),
  rank INTEGER NOT NULL DEFAULT 1024,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_links_kind ON links(kind);
CREATE INDEX IF NOT EXISTS idx_links_rank ON links(rank);

CREATE TABLE IF NOT EXISTS task_links (
  task_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  PRIMARY KEY (task_id, link_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_links_task_id ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_link_id ON task_links(link_id);

CREATE TABLE IF NOT EXISTS project_links (
  project_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  PRIMARY KEY (project_id, link_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_link_id ON project_links(link_id);

INSERT INTO projects(
  id, space_id, parent_id, path,
  title, note, priority,
  todo_task_count, done_task_count, last_task_updated_at,
  created_at, updated_at, archived_at, deleted_at,
  create_by, rank
) SELECT
  id, space_id, parent_id, path,
  name, note, priority,
  0, 0, NULL,
  created_at, updated_at, archived_at, NULL,
  'stonefish', 1024
FROM projects_old;

INSERT INTO tags(id, name, created_at)
SELECT id, name, created_at FROM tags_old;

INSERT INTO tasks(
  id, space_id, project_id, title, note, status, done_reason, priority,
  rank, created_at, updated_at, completed_at, deadline_at, archived_at, deleted_at,
  custom_fields, create_by
) SELECT
  id, space_id, project_id, title, note, status, done_reason, priority,
  rank, created_at, updated_at, completed_at, deadline_at, archived_at, deleted_at,
  custom_fields, create_by
FROM tasks_old;

INSERT INTO task_tags(task_id, tag_id)
SELECT task_id, tag_id FROM task_tags_old;

UPDATE projects
SET todo_task_count = (
  SELECT COUNT(1) FROM tasks t
  WHERE t.project_id = projects.id
    AND t.status = 'todo'
    AND t.archived_at IS NULL
    AND t.deleted_at IS NULL
),
done_task_count = (
  SELECT COUNT(1) FROM tasks t
  WHERE t.project_id = projects.id
    AND t.status = 'done'
    AND t.archived_at IS NULL
    AND t.deleted_at IS NULL
),
last_task_updated_at = (
  SELECT MAX(t.updated_at) FROM tasks t
  WHERE t.project_id = projects.id
);

DROP TABLE projects_old;
DROP TABLE tags_old;
DROP TABLE task_tags_old;
DROP TABLE tasks_old;

PRAGMA foreign_keys = ON;
