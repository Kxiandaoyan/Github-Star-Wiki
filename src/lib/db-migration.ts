import db from './db';

/**
 * 数据库迁移工具
 * 用于兼容升级现有数据库结构
 */

export interface MigrationResult {
  success: boolean;
  version: number;
  message: string;
  error?: string;
}

/**
 * 获取当前数据库版本
 */
export function getCurrentDbVersion(): number {
  try {
    const result = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('DB_VERSION') as { value: string } | undefined;
    return result ? Number.parseInt(result.value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * 设置数据库版本
 */
function setDbVersion(version: number) {
  db.prepare(`
    INSERT INTO app_settings (key, value, created_at, updated_at)
    VALUES ('DB_VERSION', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(version.toString());
}

/**
 * 迁移到版本1：添加标签和专题配置表
 */
function migrateToV1(): MigrationResult {
  try {
    db.exec(`
      -- 创建标签表（用于标准化语义标签）
      CREATE TABLE IF NOT EXISTS semantic_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 创建项目标签关联表
      CREATE TABLE IF NOT EXISTS project_tags (
        project_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        weight REAL DEFAULT 1.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, tag_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES semantic_tags(id) ON DELETE CASCADE
      );

      -- 创建专题配置表（支持动态配置专题）
      CREATE TABLE IF NOT EXISTS collection_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'custom',
        match_rules TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_semantic_tags_category ON semantic_tags(category);
      CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_project_tags_weight ON project_tags(weight DESC);
      CREATE INDEX IF NOT EXISTS idx_collection_definitions_active ON collection_definitions(is_active, sort_order);
    `);

    setDbVersion(1);
    return {
      success: true,
      version: 1,
      message: '成功创建标签和专题配置表',
    };
  } catch (error) {
    return {
      success: false,
      version: 0,
      message: '迁移到版本1失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 迁移到版本2：优化现有表结构
 */
function migrateToV2(): MigrationResult {
  try {
    // 检查列是否存在
    const hasColumn = (tableName: string, columnName: string): boolean => {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
      return columns.some((col) => col.name === columnName);
    };

    // 为 projects 表添加缓存字段
    if (!hasColumn('projects', 'semantic_cache_version')) {
      db.exec(`
        ALTER TABLE projects ADD COLUMN semantic_cache_version INTEGER DEFAULT 0;
      `);
    }

    if (!hasColumn('projects', 'last_semantic_update')) {
      db.exec(`
        ALTER TABLE projects ADD COLUMN last_semantic_update DATETIME;
      `);
    }

    // 为 project_analysis 添加索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_project_analysis_semantic_completed
        ON project_analysis(semantic_completed_at DESC);
    `);

    setDbVersion(2);
    return {
      success: true,
      version: 2,
      message: '成功优化表结构',
    };
  } catch (error) {
    return {
      success: false,
      version: 1,
      message: '迁移到版本2失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 执行所有待执行的迁移
 */
export function runMigrations(): MigrationResult[] {
  const currentVersion = getCurrentDbVersion();
  const results: MigrationResult[] = [];

  console.log(`当前数据库版本: ${currentVersion}`);

  const migrations = [
    { version: 1, migrate: migrateToV1 },
    { version: 2, migrate: migrateToV2 },
  ];

  for (const { version, migrate } of migrations) {
    if (currentVersion < version) {
      console.log(`执行迁移到版本 ${version}...`);
      const result = migrate();
      results.push(result);

      if (!result.success) {
        console.error(`迁移失败: ${result.message}`, result.error);
        break;
      }

      console.log(`✓ ${result.message}`);
    }
  }

  if (results.length === 0) {
    console.log('数据库已是最新版本，无需迁移');
  }

  return results;
}

/**
 * 回滚到指定版本（谨慎使用）
 */
export function rollbackToVersion(targetVersion: number): MigrationResult {
  const currentVersion = getCurrentDbVersion();

  if (targetVersion >= currentVersion) {
    return {
      success: false,
      version: currentVersion,
      message: '目标版本必须小于当前版本',
    };
  }

  try {
    // 根据目标版本执行回滚
    if (currentVersion >= 2 && targetVersion < 2) {
      // 回滚版本2的更改
      db.exec(`
        DROP INDEX IF EXISTS idx_project_analysis_semantic_completed;
      `);
      // 注意：SQLite 不支持 DROP COLUMN，所以新增的列会保留但不使用
    }

    if (currentVersion >= 1 && targetVersion < 1) {
      // 回滚版本1的更改
      db.exec(`
        DROP TABLE IF EXISTS project_tags;
        DROP TABLE IF EXISTS semantic_tags;
        DROP TABLE IF EXISTS collection_definitions;
      `);
    }

    setDbVersion(targetVersion);
    return {
      success: true,
      version: targetVersion,
      message: `成功回滚到版本 ${targetVersion}`,
    };
  } catch (error) {
    return {
      success: false,
      version: currentVersion,
      message: '回滚失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
