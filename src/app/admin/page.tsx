import Link from 'next/link';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { requireAdminPageAuth } from '@/lib/admin-auth';
import { evaluateProjectContentQuality } from '@/lib/content-quality';
import db from '@/lib/db';
import { getSeoDescriptionQualityIssue, getSeoTitleQualityIssue } from '@/lib/seo-utils';
import { getSettingsByCategory } from '@/lib/settings';

interface QueueCountRow {
  status: string;
  count: number;
}

interface ProjectAuditRow {
  id: number;
  full_name: string;
  one_line_intro: string | null;
  chinese_intro: string | null;
  seo_title: string | null;
  seo_description: string | null;
  intro_status: string;
  wiki_status: string;
  mind_map: string | null;
  faq_json: string | null;
  project_type: string | null;
  stars: number;
  wiki_count: number;
}

interface PipelineRow {
  id: number;
  project_id: number;
  task_type: string;
  status: string;
  error_message: string | null;
  full_name: string;
  scan_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
  semantic_data: string | null;
}

interface RecentProject {
  id: number;
  full_name: string;
  one_line_status: string;
  intro_status: string;
  wiki_status: string;
  synced_at: string | null;
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

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminPageAuth();

  const settings = getSettingsByCategory();
  const queueRows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM task_queue
    GROUP BY status
  `).all() as QueueCountRow[];

  const queue = {
    pending: queueRows.find((row) => row.status === 'pending')?.count || 0,
    processing: queueRows.find((row) => row.status === 'processing')?.count || 0,
    completed: queueRows.find((row) => row.status === 'completed')?.count || 0,
    failed: queueRows.find((row) => row.status === 'failed')?.count || 0,
    skipped: queueRows.find((row) => row.status === 'skipped')?.count || 0,
  };

  const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
  const wikiReadyCount = (db.prepare(`
    SELECT COUNT(*) as count
    FROM projects
    WHERE wiki_status = 'completed'
  `).get() as { count: number }).count;

  const recentProjects = db.prepare(`
    SELECT id, full_name, one_line_status, intro_status, wiki_status, synced_at
    FROM projects
    ORDER BY COALESCE(synced_at, created_at) DESC
    LIMIT 8
  `).all() as RecentProject[];

  const auditRows = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.one_line_intro,
      p.chinese_intro,
      p.seo_title,
      p.seo_description,
      p.intro_status,
      p.wiki_status,
      p.mind_map,
      p.faq_json,
      p.project_type,
      p.stars,
      (
        SELECT COUNT(*)
        FROM wiki_documents wd
        WHERE wd.project_id = p.id
      ) as wiki_count
    FROM projects p
    ORDER BY p.stars DESC, p.synced_at DESC
  `).all() as ProjectAuditRow[];

  const pipelineRows = db.prepare(`
    SELECT
      tq.id,
      tq.project_id,
      tq.task_type,
      tq.status,
      tq.error_message,
      p.full_name,
      pa.scan_data,
      pa.analysis_data,
      pa.deep_read_data,
      pa.semantic_data
    FROM task_queue tq
    JOIN projects p ON p.id = tq.project_id
    LEFT JOIN project_analysis pa ON pa.project_id = tq.project_id
    WHERE tq.status IN ('pending', 'processing', 'failed')
    ORDER BY
      CASE tq.status
        WHEN 'processing' THEN 0
        WHEN 'pending' THEN 1
        ELSE 2
      END,
      tq.priority ASC,
      tq.created_at ASC
    LIMIT 10
  `).all() as PipelineRow[];

  const seoIssues = auditRows
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      titleIssue: getSeoTitleQualityIssue(row.seo_title, row.full_name),
      descriptionIssue: getSeoDescriptionQualityIssue(row.seo_description, row.full_name),
      stars: row.stars,
    }))
    .filter((row) => row.titleIssue || row.descriptionIssue)
    .sort((left, right) => {
      const leftScore = Number(Boolean(left.titleIssue)) + Number(Boolean(left.descriptionIssue));
      const rightScore = Number(Boolean(right.titleIssue)) + Number(Boolean(right.descriptionIssue));
      return rightScore - leftScore || right.stars - left.stars;
    })
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      titleIssue: row.titleIssue,
      descriptionIssue: row.descriptionIssue,
    }));

  const qualityRows = auditRows.map((row) => {
    const wikiDocuments = row.wiki_count > 0
      ? db.prepare('SELECT title, content FROM wiki_documents WHERE project_id = ? ORDER BY sort_order').all(row.id) as Array<{ title: string; content: string }>
      : [];
    const result = evaluateProjectContentQuality({
      projectName: row.full_name,
      oneLineIntro: row.one_line_intro,
      chineseIntro: row.chinese_intro,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      projectType: row.project_type,
      faqJson: row.faq_json,
      mindMap: row.mind_map,
      introStatus: row.intro_status,
      wikiStatus: row.wiki_status,
      wikiDocuments,
    });

    return {
      id: row.id,
      full_name: row.full_name,
      score: result.score,
      issues: result.issues,
      strengths: result.strengths,
      stars: row.stars,
    };
  });

  const seoStats = {
    indexableCount: auditRows.filter((row) => row.intro_status === 'completed' || row.wiki_status === 'completed').length,
    seoTitleCount: auditRows.filter((row) => row.seo_title && row.seo_title.trim()).length,
    seoDescriptionCount: auditRows.filter((row) => row.seo_description && row.seo_description.trim()).length,
    readyButMissingSeoCount: auditRows.filter((row) =>
      (row.intro_status === 'completed' || row.wiki_status === 'completed')
      && (!row.seo_title?.trim() || !row.seo_description?.trim())
    ).length,
    titleIssueCount: auditRows.filter((row) => Boolean(getSeoTitleQualityIssue(row.seo_title, row.full_name))).length,
    descriptionIssueCount: auditRows.filter((row) => Boolean(getSeoDescriptionQualityIssue(row.seo_description, row.full_name))).length,
    mindMapCount: auditRows.filter((row) => row.mind_map && row.mind_map.trim()).length,
  };

  const qualityStats = {
    averageScore: qualityRows.length > 0
      ? Math.round(qualityRows.reduce((sum, row) => sum + row.score, 0) / qualityRows.length)
      : 0,
    highQualityCount: qualityRows.filter((row) => row.score >= 80).length,
    mediumQualityCount: qualityRows.filter((row) => row.score >= 60 && row.score < 80).length,
    lowQualityCount: qualityRows.filter((row) => row.score < 60).length,
    missingInstallCount: qualityRows.filter((row) => row.issues.includes('缺少安装信息')).length,
    missingUsageCount: qualityRows.filter((row) => row.issues.includes('缺少使用方法')).length,
    missingProblemCount: qualityRows.filter((row) => row.issues.includes('没有明确写出解决的问题')).length,
  };

  const qualityIssues = qualityRows
    .filter((row) => row.score < 70 || row.issues.length >= 3)
    .sort((left, right) => left.score - right.score || right.stars - left.stars)
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      score: row.score,
      issues: row.issues,
    }));

  const pipelineItems = pipelineRows.map((row) => {
    const analysis = parseJson<{ summary?: string; recommendedFiles?: string[] }>(row.analysis_data);
    const deepRead = parseJson<{ reasoningSummary?: string }>(row.deep_read_data);

    return {
      id: row.id,
      projectId: row.project_id,
      fullName: row.full_name,
      taskType: row.task_type,
      status: row.status,
      errorMessage: row.error_message,
      scanReady: Boolean(row.scan_data),
      analysisReady: Boolean(row.analysis_data),
      deepReadReady: Boolean(row.deep_read_data),
      semanticReady: Boolean(row.semantic_data),
      analysisSummary: analysis?.summary || null,
      recommendedFiles: analysis?.recommendedFiles?.slice(0, 4) || [],
      reasoningSummary: deepRead?.reasoningSummary || null,
    };
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回前台
            </Link>
            <div className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground">
              <Settings2 className="h-4 w-4 text-primary" />
              `/admin`
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main translate="no" className="notranslate mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-6">
        <section className="mb-8 surface-panel rounded-[2rem] p-7 md:p-9">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">
            Star Wiki 后台
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-8 text-muted-foreground md:text-base">
            这里统一管理 GitHub、模型、调度与提示词，同时直接看到多阶段生成进度、内容质量与 SEO 缺口，方便用最低维护成本保持内容稳定。
          </p>
        </section>

        <AdminDashboard
          initialSettings={settings}
          queue={queue}
          projectCount={projectCount}
          wikiReadyCount={wikiReadyCount}
          seoStats={seoStats}
          qualityStats={qualityStats}
          seoIssues={seoIssues}
          qualityIssues={qualityIssues}
          pipelineItems={pipelineItems}
          recentProjects={recentProjects}
        />
      </main>
    </div>
  );
}
