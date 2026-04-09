interface WikiLikeDocument {
  title: string;
  content: string;
}

function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…` : value;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countKeywordHits(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

export function inferProjectTypeFromContent(
  projectName: string,
  description: string,
  wikiDocuments: WikiLikeDocument[]
) {
  const haystack = normalizeComparableText([
    projectName,
    description,
    wikiDocuments.map((item) => `${item.title}\n${item.content}`).join('\n'),
  ].join('\n'));

  if (includesAny(haystack, ['awesome', 'awesome-list', 'resources', 'curated list'])) return 'awesome-list';
  if (includesAny(haystack, ['template', 'starter', 'boilerplate', 'scaffold'])) return 'template';
  if (includesAny(haystack, ['documentation', 'docs', 'guide', 'wiki', 'tutorial', 'knowledge base'])) return 'docs';
  if (includesAny(haystack, ['cli', 'command line', 'terminal'])) return 'cli';
  if (includesAny(haystack, ['ui', 'component library', 'design system', 'components'])) return 'ui';
  if (includesAny(haystack, ['plugin', 'extension', 'adapter'])) return 'plugin';
  if (includesAny(haystack, ['config', 'configuration', 'dotfiles'])) return 'config';
  if (includesAny(haystack, ['library', 'sdk', 'framework'])) return 'library';
  if (includesAny(haystack, ['course', 'ebook', 'newsletter', 'content'])) return 'content';
  if (includesAny(haystack, ['app', 'application', 'platform', 'dashboard', 'tool'])) return 'app';

  return 'unknown';
}

export function buildFallbackSeoTitle(projectName: string, projectType: string) {
  const typeLabelMap: Record<string, string> = {
    app: '是什么？用途、安装与使用指南',
    library: '开源库：用途、安装与使用指南',
    cli: 'CLI 工具：安装、命令与使用场景',
    plugin: '插件：用途、安装与配置说明',
    ui: 'UI 组件库：适用场景与集成方式',
    template: '模板：适用场景、启动方式与用法',
    docs: '文档/知识库：适合谁看、怎么使用',
    'awesome-list': '资源合集：适合谁看、怎么使用',
    content: '内容项目：核心内容与阅读方式',
    config: '配置项目：用途与配置说明',
    unknown: '是什么？用途、安装与使用指南',
  };

  return truncateText(`${projectName} ${typeLabelMap[projectType] || typeLabelMap.unknown}`, 68);
}

export function buildFallbackSeoDescription(
  projectName: string,
  oneLineIntro: string,
  chineseIntro: string,
  projectType: string
) {
  const intro = normalizeText(oneLineIntro || chineseIntro).slice(0, 72);
  const suffix = ['docs', 'awesome-list', 'content'].includes(projectType)
    ? '本页整理它适合谁看、核心内容和站内延伸入口。'
    : '本页整理它解决什么问题、适用场景、安装方式和使用方法。';

  return truncateText(`${projectName}${intro ? `：${intro}` : ''}${suffix}`, 155);
}

export function getSeoTitleQualityIssue(title: string | null | undefined, projectName: string) {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) {
    return '缺少 SEO 标题';
  }

  if (normalizedTitle.length < 12) {
    return 'SEO 标题过短';
  }

  if (normalizedTitle.length > 70) {
    return 'SEO 标题过长';
  }

  const comparableTitle = normalizeComparableText(normalizedTitle);
  const comparableProjectName = normalizeComparableText(projectName);

  if (comparableTitle === comparableProjectName) {
    return 'SEO 标题只有项目名';
  }

  const titleWithoutName = comparableTitle.replace(comparableProjectName, '').trim();
  if (
    titleWithoutName &&
    /^(项目|介绍|详情|官网|文档|使用说明|开源项目|github)$/.test(titleWithoutName.replace(/[：:|\-()（）?？]/g, ''))
  ) {
    return 'SEO 标题信息量不足';
  }

  const informativeKeywords = [
    '是什么',
    '用途',
    '安装',
    '使用',
    '指南',
    '场景',
    '开源',
    '工具',
    '组件',
    '模板',
    '插件',
    'sdk',
    'cli',
    'agent',
    'next.js',
    'nextjs',
    'automation',
  ];

  if (countKeywordHits(comparableTitle, informativeKeywords) === 0) {
    return 'SEO 标题缺少用途或场景信息';
  }

  return null;
}

export function getSeoDescriptionQualityIssue(description: string | null | undefined, projectName: string) {
  const normalizedDescription = normalizeText(description);
  if (!normalizedDescription) {
    return '缺少 SEO 描述';
  }

  if (normalizedDescription.length < 45) {
    return 'SEO 描述过短';
  }

  if (normalizedDescription.length > 170) {
    return 'SEO 描述过长';
  }

  const comparableDescription = normalizeComparableText(normalizedDescription);
  const comparableProjectName = normalizeComparableText(projectName);

  if (comparableDescription === comparableProjectName) {
    return 'SEO 描述只有项目名';
  }

  const informativeKeywords = [
    '解决',
    '适合',
    '场景',
    '安装',
    '使用',
    '教程',
    '指南',
    '配置',
    '工作流',
    'workflow',
    'automation',
    'agent',
    'template',
    'library',
    'plugin',
    '组件',
    '命令',
  ];

  const genericFragments = [
    '这是一个开源项目',
    '项目介绍',
    '项目详情',
    '欢迎使用',
    '点击查看',
    '更多信息',
  ];

  if (
    genericFragments.some((fragment) => normalizedDescription.includes(fragment))
    && countKeywordHits(comparableDescription, informativeKeywords) < 2
  ) {
    return 'SEO 描述过于泛化';
  }

  if (countKeywordHits(comparableDescription, informativeKeywords) < 2) {
    return 'SEO 描述缺少用途、场景或使用信息';
  }

  return null;
}
