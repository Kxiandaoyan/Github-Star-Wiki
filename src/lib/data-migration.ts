/**
 * 数据迁移脚本
 * 用于将现有数据升级到新的分类体系
 */

import db from './db';
import { EXTENDED_SEMANTIC_CLUSTERS, EXTENDED_USE_CASES } from './taxonomy-extended';
import { deriveProjectSemanticProfile } from './semantic-profile';
import { parseTopics } from './taxonomy';
import type { RepositoryAnalysisResult, RepositoryDeepReadResult } from './project-analysis';

interface ProjectRow {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  project_type: string | null;
  topics: string | null;
  semantic_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * 步骤1：初始化标准化标签表
 */
export function seedSemanticTags() {
  console.log('开始初始化语义标签表...');

  const insertTag = db.prepare(`
    INSERT INTO semantic_tags (tag, category, display_name, description, color)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tag) DO UPDATE SET
      display_name = excluded.display_name,
      description = excluded.description,
      color = excluded.color
  `);

  const transaction = db.transaction(() => {
    for (const cluster of EXTENDED_SEMANTIC_CLUSTERS) {
      insertTag.run(
        cluster.id,
        'cluster',
        cluster.label,
        cluster.description,
        cluster.color
      );
    }

    for (const useCase of EXTENDED_USE_CASES) {
      insertTag.run(
        useCase.slug,
        'use_case',
        useCase.name,
        useCase.description,
        '#64748b'
      );
    }
  });

  transaction();
  console.log(`✓ 已初始化 ${EXTENDED_SEMANTIC_CLUSTERS.length + EXTENDED_USE_CASES.length} 个标签`);
}

/**
 * 步骤2：重新生成所有项目的语义画像（使用新的聚类定义）
 */
export function regenerateSemanticProfiles(batchSize = 100) {
  console.log('开始重新生成语义画像...');

  const projects = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.description,
      p.one_line_intro,
      p.chinese_intro,
      p.project_type,
      p.topics,
      pa.semantic_data,
      pa.analysis_data,
      pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.one_line_status = 'completed'
       OR p.intro_status = 'completed'
  `).all() as ProjectRow[];

  console.log(`找到 ${projects.length} 个需要更新的项目`);

  const updateSemantic = db.prepare(`
    INSERT INTO project_analysis (project_id, semantic_data, semantic_completed_at, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id) DO UPDATE SET
      semantic_data = excluded.semantic_data,
      semantic_completed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `);

  const updateCacheVersion = db.prepare(`
    UPDATE projects
    SET semantic_cache_version = 1,
        last_semantic_update = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let processed = 0;
  const transaction = db.transaction((batch: ProjectRow[]) => {
    for (const project of batch) {
      try {
        const profile = deriveProjectSemanticProfile({
          projectName: project.full_name,
          description: project.description,
          projectType: project.project_type,
          topics: parseTopics(project.topics),
          oneLineIntro: project.one_line_intro,
          chineseIntro: project.chinese_intro,
          analysis: parseJson<RepositoryAnalysisResult>(project.analysis_data),
          deepRead: parseJson<RepositoryDeepReadResult>(project.deep_read_data),
        });

        updateSemantic.run(project.id, JSON.stringify(profile));
        updateCacheVersion.run(project.id);
        processed++;
      } catch (error) {
        console.error(`处理项目 ${project.full_name} 失败:`, error);
      }
    }
  });

  // 分批处理
  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    transaction(batch);
    console.log(`已处理 ${Math.min(i + batchSize, projects.length)}/${projects.length} 个项目`);
  }

  console.log(`✓ 成功更新 ${processed} 个项目的语义画像`);
  return processed;
}

/**
 * 步骤3：构建项目标签关联表
 */
export function buildProjectTagsRelations(batchSize = 100) {
  console.log('开始构建项目标签关联...');

  const projects = db.prepare(`
    SELECT p.id, pa.semantic_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE pa.semantic_data IS NOT NULL
  `).all() as Array<{ id: number; semantic_data: string }>;

  console.log(`找到 ${projects.length} 个有语义数据的项目`);

  const getTagId = db.prepare('SELECT id FROM semantic_tags WHERE tag = ?');
  const insertProjectTag = db.prepare(`
    INSERT INTO project_tags (project_id, tag_id, weight)
    VALUES (?, ?, ?)
    ON CONFLICT(project_id, tag_id) DO UPDATE SET weight = excluded.weight
  `);

  let processed = 0;
  const transaction = db.transaction((batch: Array<{ id: number; semantic_data: string }>) => {
    for (const project of batch) {
      try {
        const semantic = parseJson<{ primaryCluster: string; semanticTags: string[] }>(project.semantic_data);
        if (!semantic) continue;

        // 主聚类权重最高
        const primaryTagRow = getTagId.get(semantic.primaryCluster) as { id: number } | undefined;
        if (primaryTagRow) {
          insertProjectTag.run(project.id, primaryTagRow.id, 1.0);
        }

        // 其他语义标签权重递减
        for (let i = 0; i < semantic.semanticTags.length; i++) {
          const tag = semantic.semanticTags[i];
          if (tag === semantic.primaryCluster) continue;

          const tagRow = getTagId.get(tag) as { id: number } | undefined;
          if (tagRow) {
            const weight = 0.8 - i * 0.1;
            insertProjectTag.run(project.id, tagRow.id, Math.max(0.3, weight));
          }
        }

        processed++;
      } catch (error) {
        console.error(`处理项目 ${project.id} 的标签关联失败:`, error);
      }
    }
  });

  // 分批处理
  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    transaction(batch);
    console.log(`已处理 ${Math.min(i + batchSize, projects.length)}/${projects.length} 个项目`);
  }

  console.log(`✓ 成功建立 ${processed} 个项目的标签关联`);
  return processed;
}

/**
 * 步骤4：初始化专题配置（将硬编码的专题迁移到数据库）
 */
export function seedCollectionDefinitions() {
  console.log('开始初始化专题配置...');

  const insertCollection = db.prepare(`
    INSERT INTO collection_definitions (slug, name, title, description, category, match_rules, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      title = excluded.title,
      description = excluded.description,
      match_rules = excluded.match_rules,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    // 从扩展的聚类定义生成专题
    for (let i = 0; i < EXTENDED_SEMANTIC_CLUSTERS.length; i++) {
      const cluster = EXTENDED_SEMANTIC_CLUSTERS[i];
      const matchRules = JSON.stringify({
        type: 'cluster',
        clusterId: cluster.id,
      });

      insertCollection.run(
        cluster.id,
        cluster.label,
        `${cluster.label} 开源项目`,
        cluster.description,
        'cluster',
        matchRules,
        1,
        i
      );
    }

    // 从使用场景生成专题
    for (let i = 0; i < EXTENDED_USE_CASES.length; i++) {
      const useCase = EXTENDED_USE_CASES[i];
      const matchRules = JSON.stringify({
        type: 'use_case',
        keywords: useCase.keywords,
        topicKeywords: useCase.topicKeywords,
        projectTypes: useCase.projectTypes,
        relatedClusters: useCase.relatedClusters,
      });

      insertCollection.run(
        useCase.slug,
        useCase.name,
        useCase.title,
        useCase.description,
        'use_case',
        matchRules,
        1,
        i + EXTENDED_SEMANTIC_CLUSTERS.length
      );
    }
  });

  transaction();
  console.log(`✓ 已初始化 ${EXTENDED_SEMANTIC_CLUSTERS.length + EXTENDED_USE_CASES.length} 个专题配置`);
}

/**
 * 完整迁移流程
 */
export function runFullMigration() {
  console.log('=== 开始完整数据迁移 ===\n');

  const startTime = Date.now();

  try {
    // 步骤1：初始化标签
    seedSemanticTags();
    console.log('');

    // 步骤2：重新生成语义画像
    const profileCount = regenerateSemanticProfiles();
    console.log('');

    // 步骤3：构建标签关联
    const relationCount = buildProjectTagsRelations();
    console.log('');

    // 步骤4：初始化专题配置
    seedCollectionDefinitions();
    console.log('');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== 迁移完成！耗时 ${duration} 秒 ===`);
    console.log(`- 更新了 ${profileCount} 个项目的语义画像`);
    console.log(`- 建立了 ${relationCount} 个项目的标签关联`);

    return {
      success: true,
      profileCount,
      relationCount,
      duration: Number.parseFloat(duration),
    };
  } catch (error) {
    console.error('迁移失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 验证迁移结果
 */
export function validateMigration() {
  console.log('=== 验证迁移结果 ===\n');

  const checks = [
    {
      name: '语义标签表',
      query: 'SELECT COUNT(*) as count FROM semantic_tags',
      expected: EXTENDED_SEMANTIC_CLUSTERS.length + EXTENDED_USE_CASES.length,
    },
    {
      name: '项目标签关联',
      query: 'SELECT COUNT(DISTINCT project_id) as count FROM project_tags',
      expected: null,
    },
    {
      name: '专题配置',
      query: 'SELECT COUNT(*) as count FROM collection_definitions WHERE is_active = 1',
      expected: EXTENDED_SEMANTIC_CLUSTERS.length + EXTENDED_USE_CASES.length,
    },
    {
      name: '更新的语义画像',
      query: 'SELECT COUNT(*) as count FROM projects WHERE semantic_cache_version = 1',
      expected: null,
    },
  ];

  for (const check of checks) {
    const result = db.prepare(check.query).get() as { count: number };
    const status = check.expected === null || result.count >= check.expected ? '✓' : '✗';
    console.log(`${status} ${check.name}: ${result.count}${check.expected ? ` (期望 >= ${check.expected})` : ''}`);
  }

  console.log('');
}
