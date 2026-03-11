import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'star-wiki.db');
const dataDir = path.dirname(DB_PATH);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

interface TableColumnInfo {
  name: string;
}

function hasColumn(tableName: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as TableColumnInfo[];
  return columns.some((column) => column.name === columnName);
}

function createProjectsSearchObjects() {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
      name,
      description,
      one_line_intro,
      chinese_intro,
      language,
      topics,
      content=projects,
      content_rowid=id
    )
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
      INSERT INTO projects_fts(rowid, name, description, one_line_intro, chinese_intro, language, topics)
      VALUES (new.id, new.name, new.description, new.one_line_intro, new.chinese_intro, new.language, new.topics);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
      INSERT INTO projects_fts(projects_fts, rowid, name, description, one_line_intro, chinese_intro, language, topics)
      VALUES('delete', old.id, old.name, old.description, old.one_line_intro, old.chinese_intro, old.language, old.topics);
      INSERT INTO projects_fts(rowid, name, description, one_line_intro, chinese_intro, language, topics)
      VALUES (new.id, new.name, new.description, new.one_line_intro, new.chinese_intro, new.language, new.topics);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
      INSERT INTO projects_fts(projects_fts, rowid, name, description, one_line_intro, chinese_intro, language, topics)
      VALUES('delete', old.id, old.name, old.description, old.one_line_intro, old.chinese_intro, old.language, old.topics);
    END
  `);
}

export function rebuildProjectsSearchIndex() {
  const rebuild = db.transaction(() => {
    db.exec(`
      DROP TRIGGER IF EXISTS projects_ai;
      DROP TRIGGER IF EXISTS projects_au;
      DROP TRIGGER IF EXISTS projects_ad;
      DROP TABLE IF EXISTS projects_fts;
    `);

    createProjectsSearchObjects();

    db.exec(`
      INSERT INTO projects_fts (rowid, name, description, one_line_intro, chinese_intro, language, topics)
      SELECT id, name, description, one_line_intro, chinese_intro, language, topics
      FROM projects
    `);
  });

  rebuild();
  console.log('Search index rebuilt.');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      description TEXT,
      one_line_intro TEXT,
      chinese_intro TEXT,
      html_url TEXT NOT NULL,
      stars INTEGER DEFAULT 0,
      language TEXT,
      topics TEXT,
      fork BOOLEAN DEFAULT 0,
      homepage TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      starred_at DATETIME,
      synced_at DATETIME,
      one_line_status TEXT DEFAULT 'pending',
      intro_status TEXT DEFAULT 'pending',
      wiki_status TEXT DEFAULT 'pending'
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS wiki_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      priority INTEGER DEFAULT 5,
      status TEXT DEFAULT 'pending',
      available_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      priority INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT 1,
      daily_limit INTEGER DEFAULT 500,
      daily_used INTEGER DEFAULT 0,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  createProjectsSearchObjects();

  if (!hasColumn('task_queue', 'available_at')) {
    db.exec(`
      ALTER TABLE task_queue
      ADD COLUMN available_at DATETIME
    `);
    db.exec(`
      UPDATE task_queue
      SET available_at = CURRENT_TIMESTAMP
      WHERE available_at IS NULL
    `);
  }

  if (!hasColumn('projects', 'starred_at')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN starred_at DATETIME
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_github_id ON projects(github_id);
    CREATE INDEX IF NOT EXISTS idx_projects_full_name ON projects(full_name);
    CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_starred_at ON projects(starred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_synced_at ON projects(synced_at DESC);
    CREATE INDEX IF NOT EXISTS idx_task_queue_status_priority ON task_queue(status, priority);
    CREATE INDEX IF NOT EXISTS idx_task_queue_status_available_priority ON task_queue(status, available_at, priority);
    CREATE INDEX IF NOT EXISTS idx_wiki_documents_project_id ON wiki_documents(project_id);
  `);

  console.log('Database initialized.');
}

export default db;
