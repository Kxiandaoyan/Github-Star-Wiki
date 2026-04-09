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

export function evaluateProjectContentQuality(input: ContentQualityInput): ContentQualityResult {
  const oneLineIntro = normalizeText(input.oneLineIntro);
  const chineseIntro = normalizeText(input.chineseIntro);
  const seoTitle = normalizeText(input.seoTitle);
  const seoDescription = normalizeText(input.seoDescription);
  const projectType = normalizeText(input.projectType);
  const wikiText = input.wikiDocuments.map((doc) => `${doc.title}\n${doc.content}`).join('\n').toLowerCase();
  const combinedText = `${oneLineIntro}\n${chineseIntro}\n${wikiText}`.toLowerCase();
  const faqCount = countFaqItems(input.faqJson);

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

  if (input.wikiStatus === 'completed' && input.wikiDocuments.length >= 4) {
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

  if (hasKeyword(combinedText, ['安装', '部署', 'install', 'setup'])) {
    score += 3;
  } else {
    issues.push('缺少安装信息');
  }

  if (hasKeyword(combinedText, ['使用', '上手', '命令', 'usage', 'quick start'])) {
    score += 3;
  } else {
    issues.push('缺少使用方法');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues: issues.slice(0, 6),
    strengths: strengths.slice(0, 6),
  };
}
