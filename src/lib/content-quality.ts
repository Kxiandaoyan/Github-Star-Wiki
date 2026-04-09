export interface ContentQualityInput {
  projectName: string;
  oneLineIntro: string | null;
  chineseIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  projectType: string | null;
  faqJson: string | null;
  mindMap: string | null;
  introStatus: string;
  wikiStatus: string;
  wikiDocuments: Array<{ title: string; content: string }>;
}

export interface ContentQualityResult {
  score: number;
  issues: string[];
  strengths: string[];
}

export interface ContentRepairDecision {
  needsRepair: boolean;
  triggerIssues: string[];
  suggestedTaskType: 'deep_read_repo' | 'generate_profile' | null;
}

export const AUTO_REPAIR_TRIGGER_ISSUES = [
  '中文介绍偏短或未生成',
  '一句话简介信息量不足',
  'Wiki 章节数量不足',
  '缺少完整的 SEO 标题或描述',
  'FAQ 偏少',
  '没有明确写出适用场景',
  '没有明确写出解决的问题',
  '缺少安装信息',
  '缺少使用方法',
] as const;

const DEEP_READ_TRIGGER_ISSUES = new Set<string>([
  'Wiki 章节数量不足',
  '没有明确写出适用场景',
  '没有明确写出解决的问题',
  '缺少安装信息',
  '缺少使用方法',
]);

const PROJECT_TYPES_WITH_LIGHTER_WIKI_REQUIREMENTS = new Set(['docs', 'awesome-list', 'content', 'config']);
const PROJECT_TYPES_WITHOUT_INSTALL_REQUIREMENT = new Set(['docs', 'awesome-list', 'content', 'config']);
const PROJECT_TYPES_WITHOUT_USAGE_REQUIREMENT = new Set(['docs', 'awesome-list', 'content']);

function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countFaqItems(rawFaqJson: string | null | undefined) {
  if (!rawFaqJson) {
    return 0;
  }

  try {
    const parsed = JSON.parse(rawFaqJson) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function getWikiMinimumCount(projectType: string) {
  return PROJECT_TYPES_WITH_LIGHTER_WIKI_REQUIREMENTS.has(projectType) ? 2 : 4;
}

function shouldCheckInstallInfo(projectType: string) {
  return !PROJECT_TYPES_WITHOUT_INSTALL_REQUIREMENT.has(projectType);
}

function shouldCheckUsageInfo(projectType: string) {
  return !PROJECT_TYPES_WITHOUT_USAGE_REQUIREMENT.has(projectType);
}

export function evaluateProjectContentQuality(input: ContentQualityInput): ContentQualityResult {
  const oneLineIntro = normalizeText(input.oneLineIntro);
  const chineseIntro = normalizeText(input.chineseIntro);
  const seoTitle = normalizeText(input.seoTitle);
  const seoDescription = normalizeText(input.seoDescription);
  const projectType = normalizeText(input.projectType);
  const wikiText = input.wikiDocuments.map((doc) => `${doc.title}\n${doc.content}`).join('\n').toLowerCase();
  const combinedText = `${oneLineIntro}\n${chineseIntro}\n${wikiText}`.toLowerCase();
  const faqCount = countFaqItems(input.faqJson);
  const wikiMinimumCount = getWikiMinimumCount(projectType);
  const requireInstallInfo = shouldCheckInstallInfo(projectType);
  const requireUsageInfo = shouldCheckUsageInfo(projectType);

  let score = 0;
  const issues: string[] = [];
  const strengths: string[] = [];

  if (input.introStatus === 'completed' && chineseIntro.length >= 120) {
    score += 20;
    strengths.push('已生成较完整的中文介绍');
  } else {
    issues.push('中文介绍偏短或未生成');
  }

  if (oneLineIntro.length >= 24) {
    score += 10;
    strengths.push('有可读的一句话简介');
  } else {
    issues.push('一句话简介信息量不足');
  }

  if (input.wikiStatus === 'completed' && input.wikiDocuments.length >= wikiMinimumCount) {
    score += 20;
    strengths.push('Wiki 章节覆盖较完整');
  } else {
    issues.push('Wiki 章节数量不足');
  }

  if (seoTitle && seoDescription) {
    score += 10;
    strengths.push('SEO 标题和描述已覆盖');
  } else {
    issues.push('缺少完整的 SEO 标题或描述');
  }

  if (projectType) {
    score += 8;
    strengths.push('项目类型已识别');
  } else {
    issues.push('项目类型尚未识别');
  }

  if (faqCount >= 3) {
    score += 8;
    strengths.push('FAQ 数量充足');
  } else {
    issues.push('FAQ 偏少');
  }

  if (input.mindMap?.trim()) {
    score += 6;
    strengths.push('已生成思维导图');
  }

  if (hasKeyword(combinedText, ['用途', '适合', '场景', 'use case', 'scenario'])) {
    score += 7;
    strengths.push('说明了适用场景');
  } else {
    issues.push('没有明确写出适用场景');
  }

  if (hasKeyword(combinedText, ['解决', '问题', '痛点', 'problem'])) {
    score += 5;
    strengths.push('说明了解决的问题');
  } else {
    issues.push('没有明确写出解决的问题');
  }

  if (requireInstallInfo) {
    if (hasKeyword(combinedText, ['安装', '部署', 'install', 'setup'])) {
      score += 3;
    } else {
      issues.push('缺少安装信息');
    }
  }

  if (requireUsageInfo) {
    if (hasKeyword(combinedText, ['使用', '上手', '命令', 'usage', 'quick start'])) {
      score += 3;
    } else {
      issues.push('缺少使用方法');
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues: issues.slice(0, 8),
    strengths: strengths.slice(0, 6),
  };
}

export function decideProjectContentRepair(
  result: ContentQualityResult,
  options: {
    hasDeepReadData: boolean;
    minScore?: number;
  }
): ContentRepairDecision {
  const triggerIssues = result.issues.filter((issue) =>
    AUTO_REPAIR_TRIGGER_ISSUES.includes(issue as typeof AUTO_REPAIR_TRIGGER_ISSUES[number])
  );
  const needsRepair = result.score < (options.minScore ?? 70) || triggerIssues.length >= 2;

  if (!needsRepair) {
    return {
      needsRepair: false,
      triggerIssues,
      suggestedTaskType: null,
    };
  }

  const suggestedTaskType = !options.hasDeepReadData || triggerIssues.some((issue) => DEEP_READ_TRIGGER_ISSUES.has(issue))
    ? 'deep_read_repo'
    : 'generate_profile';

  return {
    needsRepair: true,
    triggerIssues,
    suggestedTaskType,
  };
}
