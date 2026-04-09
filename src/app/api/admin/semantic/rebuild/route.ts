import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { requireAdminApi } from '@/lib/admin-auth';
import db from '@/lib/db';
import type {
  RepositoryAnalysisResult,
  RepositoryDeepReadResult,
} from '@/lib/project-analysis';
import { saveProjectSemantic } from '@/lib/project-analysis';
import { deriveProjectSemanticProfile, type ProjectSemanticProfile } from '@/lib/semantic-profile';
import { parseTopics } from '@/lib/taxonomy';

interface SemanticRow {
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
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const rows = db.prepare(`
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
         OR p.wiki_status = 'completed'
      ORDER BY p.stars DESC, p.synced_at DESC
    `).all() as SemanticRow[];

    const transaction = db.transaction(() => {
      let rebuilt = 0;
      let skipped = 0;

      rows.forEach((row) => {
        const existing = parseJson<ProjectSemanticProfile>(row.semantic_data);
        const nextProfile = deriveProjectSemanticProfile({
          projectName: row.full_name,
          description: row.description,
          projectType: row.project_type,
          topics: parseTopics(row.topics),
          oneLineIntro: row.one_line_intro,
          chineseIntro: row.chinese_intro,
          analysis: parseJson<RepositoryAnalysisResult>(row.analysis_data),
          deepRead: parseJson<RepositoryDeepReadResult>(row.deep_read_data),
        });

        const nextSerialized = JSON.stringify(nextProfile);
        if (existing && JSON.stringify(existing) === nextSerialized) {
          skipped += 1;
          return;
        }

        saveProjectSemantic(row.id, nextProfile);
        rebuilt += 1;
      });

      return { rebuilt, skipped, total: rows.length };
    });

    const result = transaction();
    return apiSuccess(
      result,
      `已回填 ${result.rebuilt} 个项目的语义缓存，跳过 ${result.skipped} 个无需更新的项目。`
    );
  } catch (error) {
    return apiError('语义缓存回填失败。', 500, 'SEMANTIC_REBUILD_FAILED', error instanceof Error ? error.message : undefined);
  }
}
