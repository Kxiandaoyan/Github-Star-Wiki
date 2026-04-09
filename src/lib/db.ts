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
      seo_title,
      seo_description,
      project_type,
      language,
      topics,
      content=projects,
      content_rowid=id
    )
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
      INSERT INTO projects_fts(
        rowid, name, description, one_line_intro, chinese_intro,
        seo_title, seo_description, project_type, language, topics
      )
      VALUES (
        new.id, new.name, new.description, new.one_line_intro, new.chinese_intro,
        new.seo_title, new.seo_description, new.project_type, new.language, new.topics
      );
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
      INSERT INTO projects_fts(
        projects_fts, rowid, name, description, one_line_intro, chinese_intro,
        seo_title, seo_description, project_type, language, topics
      )
      VALUES(
        'delete', old.id, old.name, old.description, old.one_line_intro, old.chinese_intro,
        old.seo_title, old.seo_description, old.project_type, old.language, old.topics
      );
      INSERT INTO projects_fts(
        rowid, name, description, one_line_intro, chinese_intro,
        seo_title, seo_description, project_type, language, topics
      )
      VALUES (
        new.id, new.name, new.description, new.one_line_intro, new.chinese_intro,
        new.seo_title, new.seo_description, new.project_type, new.language, new.topics
      );
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
      INSERT INTO projects_fts(
        projects_fts, rowid, name, description, one_line_intro, chinese_intro,
        seo_title, seo_description, project_type, language, topics
      )
      VALUES(
        'delete', old.id, old.name, old.description, old.one_line_intro, old.chinese_intro,
        old.seo_title, old.seo_description, old.project_type, old.language, old.topics
      );
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
      INSERT INTO projects_fts (
        rowid, name, description, one_line_intro, chinese_intro,
        seo_title, seo_description, project_type, language, topics
      )
      SELECT
        id, name, description, one_line_intro, chinese_intro,
        seo_title, seo_description, project_type, language, topics
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
      wiki_status TEXT DEFAULT 'pending',
      mind_map TEXT,
      seo_title TEXT,
      seo_description TEXT,
      faq_json TEXT,
      project_type TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    CREATE TABLE IF NOT EXISTS project_analysis (
      project_id INTEGER PRIMARY KEY,
      scan_data TEXT,
      analysis_data TEXT,
      deep_read_data TEXT,
      semantic_data TEXT,
      scan_completed_at DATETIME,
      analysis_completed_at DATETIME,
      deep_read_completed_at DATETIME,
      semantic_completed_at DATETIME,
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

  if (!hasColumn('projects', 'mind_map')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN mind_map TEXT
    `);
  }

  if (!hasColumn('projects', 'seo_title')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN seo_title TEXT
    `);
  }

  if (!hasColumn('projects', 'seo_description')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN seo_description TEXT
    `);
  }

  if (!hasColumn('projects', 'faq_json')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN faq_json TEXT
    `);
  }

  if (!hasColumn('projects', 'project_type')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN project_type TEXT
    `);
  }

  if (!hasColumn('projects', 'auto_repair_count')) {
    db.exec(`
      ALTER TABLE projects
      ADD COLUMN auto_repair_count INTEGER DEFAULT 0
    `);
  }

  if (!hasColumn('project_analysis', 'semantic_data')) {
    db.exec(`
      ALTER TABLE project_analysis
      ADD COLUMN semantic_data TEXT
    `);
  }

  if (!hasColumn('project_analysis', 'semantic_completed_at')) {
    db.exec(`
      ALTER TABLE project_analysis
      ADD COLUMN semantic_completed_at DATETIME
    `);
  }

  if (!hasColumn('projects_fts', 'seo_title')) {
    rebuildProjectsSearchIndex();
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_github_id ON projects(github_id);
    CREATE INDEX IF NOT EXISTS idx_projects_full_name ON projects(full_name);
    CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_starred_at ON projects(starred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_synced_at ON projects(synced_at DESC);
    CREATE INDEX IF NOT EXISTS idx_task_queue_status_priority ON task_queue(status, priority);
    CREATE INDEX IF NOT EXISTS idx_task_queue_status_available_priority ON task_queue(status, available_at, priority);
    CREATE INDEX IF NOT EXISTS idx_task_queue_project_task_status ON task_queue(project_id, task_type, status);
    CREATE INDEX IF NOT EXISTS idx_wiki_documents_project_id ON wiki_documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_analysis_updated_at ON project_analysis(updated_at DESC);
  `);

  console.log('Database initialized.');
}

export default db;
