import db from './db';
import type { ProjectSemanticProfile } from './semantic-profile';

export interface RepositoryScanResult {
  readme: string;
  structure: string;
  facts: string;
  candidateFiles: string[];
  documentationFiles: string[];
}

export interface RepositoryAnalysisResult {
  projectType: string;
  summary: string;
  problemSolved: string;
  useCases: string[];
  installGuide: string[];
  usageGuide: string[];
  mainModules: string[];
  recommendedFiles: string[];
  shouldGenerateMindMap: boolean;
  confidence: 'low' | 'medium' | 'high';
}

export interface RepositoryDeepReadResult {
  keyFileSummaries: Array<{
    path: string;
    summary: string;
  }>;
  architectureNotes: string[];
  installEvidence: string[];
  usageEvidence: string[];
  moduleMap: Array<{
    name: string;
    purpose: string;
  }>;
  reasoningSummary: string;
}

interface AnalysisRow {
  scan_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
  semantic_data: string | null;
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

function upsertField(projectId: number, field: 'scan_data' | 'analysis_data' | 'deep_read_data', value: string) {
  const completedAtField = field === 'scan_data'
    ? 'scan_completed_at'
    : field === 'analysis_data'
      ? 'analysis_completed_at'
      : 'deep_read_completed_at';

  db.prepare(`
    INSERT INTO project_analysis (project_id, ${field}, ${completedAtField}, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id) DO UPDATE SET
      ${field} = excluded.${field},
      ${completedAtField} = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(projectId, value);
}

function upsertSemantic(projectId: number, value: string) {
  db.prepare(`
    INSERT INTO project_analysis (project_id, semantic_data, semantic_completed_at, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id) DO UPDATE SET
      semantic_data = excluded.semantic_data,
      semantic_completed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(projectId, value);
}

export function saveProjectScan(projectId: number, scan: RepositoryScanResult) {
  upsertField(projectId, 'scan_data', JSON.stringify(scan));
}

export function saveProjectAnalysis(projectId: number, analysis: RepositoryAnalysisResult) {
  upsertField(projectId, 'analysis_data', JSON.stringify(analysis));
}

export function saveProjectDeepRead(projectId: number, deepRead: RepositoryDeepReadResult) {
  upsertField(projectId, 'deep_read_data', JSON.stringify(deepRead));
}

export function saveProjectSemantic(projectId: number, semanticProfile: ProjectSemanticProfile) {
  upsertSemantic(projectId, JSON.stringify(semanticProfile));
}

export function getProjectAnalysisArtifacts(projectId: number) {
  const row = db.prepare(`
    SELECT scan_data, analysis_data, deep_read_data, semantic_data
    FROM project_analysis
    WHERE project_id = ?
  `).get(projectId) as AnalysisRow | undefined;

  return {
    scan: parseJson<RepositoryScanResult>(row?.scan_data || null),
    analysis: parseJson<RepositoryAnalysisResult>(row?.analysis_data || null),
    deepRead: parseJson<RepositoryDeepReadResult>(row?.deep_read_data || null),
    semantic: parseJson<ProjectSemanticProfile>(row?.semantic_data || null),
  };
}

export function clearProjectAnalysis(projectId: number) {
  db.prepare('DELETE FROM project_analysis WHERE project_id = ?').run(projectId);
}

export function clearAllProjectAnalysis() {
  db.prepare('DELETE FROM project_analysis').run();
}

export function buildRepositoryEvidenceText(
  scan: RepositoryScanResult | null,
  analysis: RepositoryAnalysisResult | null,
  deepRead: RepositoryDeepReadResult | null
) {
  const sections: string[] = [];

  if (analysis) {
    sections.push([
      '## 仓库分析结论',
      `projectType: ${analysis.projectType}`,
      `summary: ${analysis.summary}`,
      `problemSolved: ${analysis.problemSolved}`,
      analysis.useCases.length > 0 ? `useCases:\n- ${analysis.useCases.join('\n- ')}` : '',
      analysis.installGuide.length > 0 ? `installGuide:\n- ${analysis.installGuide.join('\n- ')}` : '',
      analysis.usageGuide.length > 0 ? `usageGuide:\n- ${analysis.usageGuide.join('\n- ')}` : '',
      analysis.mainModules.length > 0 ? `mainModules:\n- ${analysis.mainModules.join('\n- ')}` : '',
      `shouldGenerateMindMap: ${analysis.shouldGenerateMindMap ? 'yes' : 'no'}`,
      `confidence: ${analysis.confidence}`,
    ].filter(Boolean).join('\n'));
  }

  if (deepRead) {
    sections.push([
      '## 深读代码证据',
      deepRead.keyFileSummaries.length > 0
        ? `keyFiles:\n${deepRead.keyFileSummaries.map((item) => `- ${item.path}: ${item.summary}`).join('\n')}`
        : '',
      deepRead.architectureNotes.length > 0 ? `architectureNotes:\n- ${deepRead.architectureNotes.join('\n- ')}` : '',
      deepRead.installEvidence.length > 0 ? `installEvidence:\n- ${deepRead.installEvidence.join('\n- ')}` : '',
      deepRead.usageEvidence.length > 0 ? `usageEvidence:\n- ${deepRead.usageEvidence.join('\n- ')}` : '',
      deepRead.moduleMap.length > 0
        ? `moduleMap:\n${deepRead.moduleMap.map((item) => `- ${item.name}: ${item.purpose}`).join('\n')}`
        : '',
      deepRead.reasoningSummary ? `reasoningSummary: ${deepRead.reasoningSummary}` : '',
    ].filter(Boolean).join('\n'));
  }

  if (scan?.candidateFiles?.length) {
    sections.push(`## 候选关键文件\n- ${scan.candidateFiles.join('\n- ')}`);
  }

  return sections.join('\n\n').slice(0, 9000);
}
