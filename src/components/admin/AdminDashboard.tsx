'use client';

import { useState } from 'react';
import type { AdminSettingItem, SettingCategory } from '@/lib/settings';
import { AdminActions } from './AdminActions';
import { AdminSettingsForm } from './AdminSettingsForm';

type SettingsByCategory = Record<SettingCategory, AdminSettingItem[]>;

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
}

interface RecentProject {
  id: number;
  full_name: string;
  one_line_status: string;
  intro_status: string;
  wiki_status: string;
  synced_at: string | null;
}

interface SeoStats {
  indexableCount: number;
  seoTitleCount: number;
  seoDescriptionCount: number;
  readyButMissingSeoCount: number;
  titleIssueCount: number;
  descriptionIssueCount: number;
  mindMapCount: number;
}

interface QualityStats {
  averageScore: number;
  highQualityCount: number;
  mediumQualityCount: number;
  lowQualityCount: number;
  missingInstallCount: number;
  missingUsageCount: number;
  missingProblemCount: number;
}

interface SeoIssueProject {
  id: number;
  full_name: string;
  titleIssue: string | null;
  descriptionIssue: string | null;
}

interface QualityIssueProject {
  id: number;
  full_name: string;
  score: number;
  issues: string[];
}

interface PipelineItem {
  id: number;
  projectId: number;
  fullName: string;
  taskType: string;
  status: string;
  errorMessage: string | null;
  scanReady: boolean;
  analysisReady: boolean;
  deepReadReady: boolean;
  semanticReady: boolean;
  analysisSummary: string | null;
  recommendedFiles: string[];
  reasoningSummary: string | null;
}

export function AdminDashboard({
  initialSettings,
  queue,
  projectCount,
  wikiReadyCount,
  seoStats,
  qualityStats,
  seoIssues,
  qualityIssues,
  pipelineItems,
  recentProjects,
}: {
  initialSettings: SettingsByCategory;
  queue: QueueStats;
  projectCount: number;
  wikiReadyCount: number;
  seoStats: SeoStats;
  qualityStats: QualityStats;
  seoIssues: SeoIssueProject[];
  qualityIssues: QualityIssueProject[];
  pipelineItems: PipelineItem[];
  recentProjects: RecentProject[];
}) {
  const [settings, setSettings] = useState(initialSettings);

  return (
    <div translate="no" className="notranslate grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
      <AdminSettingsForm initialSettings={settings} onSaved={setSettings} />
      <AdminActions
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
    </div>
  );
}
