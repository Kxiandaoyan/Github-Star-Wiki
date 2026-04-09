import db from './db';
import type { RepositoryAnalysisResult, RepositoryDeepReadResult } from './project-analysis';
import {
  deriveProjectSemanticProfile,
  getSemanticClusterLookup,
  SEMANTIC_CLUSTER_DEFINITIONS,
  type ProjectSemanticProfile,
} from './semantic-profile';

export interface ProjectListItem {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
  topics?: string | null;
  project_type?: string | null;
}

export interface RelatedProjectItem extends ProjectListItem {
  reason: string[];
  score: number;
}

export interface TaxonomyBucket {
  name: string;
  slug: string;
  count: number;
}

export interface SpecialCollectionBucket extends TaxonomyBucket {
  title: string;
  description: string;
  href: string;
}

export interface SpecialCollectionDefinition {
  slug: string;
  name: string;
  title: string;
  description: string;
  faq: Array<{ question: string; answer: string }>;
  matches: (project: SpecialCollectionProjectRow, signals: ProjectSignals) => boolean;
}

interface RawTopicRow {
  topics: string | null;
}

interface RelatedProjectRow extends ProjectListItem {
  topics: string | null;
  semantic_data?: string | null;
  analysis_data?: string | null;
  deep_read_data?: string | null;
}

interface SpecialCollectionProjectRow extends ProjectListItem {
  topics: string | null;
  semantic_data?: string | null;
  analysis_data?: string | null;
  deep_read_data?: string | null;
}

interface ProjectSignals {
  text: string;
  topics: string[];
  language: string;
  projectType: string;
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function parseJson<T>(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function intersectNormalized(left: string[], right: string[]) {
  const rightSet = new Set(right.map((item) => normalizeText(item)));
  return left.filter((item) => rightSet.has(normalizeText(item)));
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasAnyTopic(topics: string[], keywords: string[]) {
  return topics.some((topic) => keywords.some((keyword) => topic.includes(keyword)));
}

function buildSignals(project: SpecialCollectionProjectRow): ProjectSignals {
  const topics = parseTopics(project.topics).map((topic) => topic.trim().toLowerCase());
  const text = [
    project.full_name,
    project.description,
    project.one_line_intro,
    project.language,
    project.project_type,
    topics.join(' '),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return {
    text,
    topics,
    language: normalizeText(project.language),
    projectType: normalizeText(project.project_type),
  };
}

const specialCollectionDefinitions: SpecialCollectionDefinition[] = [
  {
    slug: 'ai-agents',
    name: 'AI Agent',
    title: '最佳 AI Agent 开源项目',
    description: '自动聚合站内与 AI Agent、智能助手、多代理协作、MCP 相关的开源项目，适合快速发现值得继续深挖的 Agent 基础设施、工具链与应用。',
    faq: [
      {
        question: '这个专题页会收录哪些项目？',
        answer: '优先收录与 AI Agent、assistant、multi-agent、MCP、agent workflow 等主题强相关的项目。',
      },
      {
        question: '适合用它做什么？',
        answer: '适合快速筛选你过去 Star 过的 Agent 项目，判断哪些更值得继续看实现、部署方式和使用场景。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'agent',
      'agents',
      'ai-agent',
      'ai-agents',
      'aiagents',
      'assistant',
      'multi-agent',
      'agentic',
      'mcp',
      'mcp-server',
    ]) || includesAny(signals.text, [
      'ai agent',
      'ai agents',
      'agent workflow',
      'agentic workflow',
      'assistant',
      'mcp server',
    ]),
  },
  {
    slug: 'nextjs-projects',
    name: 'Next.js',
    title: '值得关注的 Next.js 开源项目',
    description: '自动聚合站内使用 Next.js 构建的开源项目，适合从 UI、SaaS、后台、模板和 AI 应用几个方向快速浏览你过去收藏过的 Next.js 实战项目。',
    faq: [
      {
        question: '为什么单独做 Next.js 专题？',
        answer: 'Next.js 项目通常同时具备产品形态、页面结构和工程实现价值，适合做持续流量入口与站内内链枢纽。',
      },
      {
        question: '专题页里的项目怎么筛选？',
        answer: '主要依据仓库 topics、README/描述中的 Next.js 关键词，以及明确的框架特征进行聚合。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'nextjs',
      'next.js',
      'nextjs-template',
      'nextjs15',
    ]) || includesAny(signals.text, ['next.js', 'nextjs']),
  },
  {
    slug: 'automation-tools',
    name: '自动化工具',
    title: 'GitHub 上热门的自动化工具',
    description: '自动聚合与 automation、workflow、orchestration、browser automation 等主题相关的项目，帮助用户按“自动化能力”而不是单个技术名词重新发现项目。',
    faq: [
      {
        question: '这个专题页和 AI Agent 专题有什么区别？',
        answer: 'AI Agent 更偏智能体能力，自动化工具页更偏自动执行、编排和工作流效率。两者会有部分交集，但关注点不同。',
      },
      {
        question: '为什么这类页面适合做 SEO？',
        answer: '自动化工具是稳定且高频的搜索意图，专题页天然适合承接工具盘点和项目集合类关键词。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'automation',
      'workflow',
      'workflow-automation',
      'browser-automation',
      'agent-workflow',
      'agentic-workflow',
      'security-automation',
    ]) || includesAny(signals.text, [
      'automation',
      'workflow',
      'automate',
      'orchestrate',
      'orchestration',
    ]),
  },
  {
    slug: 'indie-dev-toolkit',
    name: '独立开发者',
    title: '适合独立开发者的开源项目',
    description: '自动聚合模板、starter、boilerplate、dashboard、developer tools 与 productivity 相关项目，更适合作为独立开发者搭建产品、提效和选型时的工具箱入口。',
    faq: [
      {
        question: '为什么把这类项目单独聚合？',
        answer: '独立开发者更需要低成本起步、快速验证与高复用工具，这类项目适合按实用价值重新组织。',
      },
      {
        question: '这里会包含哪些类型？',
        answer: '会包含模板、后台、效率工具、开发者工具以及适合快速搭建产品的开源项目。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'boilerplate',
      'starter',
      'starter-template',
      'template',
      'developer-tools',
      'devtools',
      'productivity',
      'dashboard',
      'admin-dashboard',
      'saas',
    ]) || includesAny(signals.text, [
      'boilerplate',
      'starter',
      'template',
      'developer tools',
      'productivity',
      'dashboard',
      'open-source alternative',
      'ship faster',
    ]),
  },
];

const useCaseDefinitions: SpecialCollectionDefinition[] = [
  {
    slug: 'agent-workflows',
    name: 'Agent 工作流',
    title: '适合 Agent 工作流的开源项目',
    description: '自动聚合可用于 AI Agent、任务编排、多代理协作与上下文管理的项目，适合作为智能工作流工具清单。',
    faq: [
      {
        question: '这类用例页和专题页有何区别？',
        answer: '专题页更强调一个热门主题，用例页更强调项目最终解决的具体任务场景。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'agent',
      'agents',
      'ai-agent',
      'mcp',
      'workflow',
      'multi-agent',
    ]) || includesAny(signals.text, ['agent', 'mcp', 'workflow orchestration']),
  },
  {
    slug: 'automation',
    name: '自动化',
    title: '适合自动化场景的开源项目',
    description: '自动聚合 workflow、automation、orchestration、browser automation 等相关项目，适合从工作流自动化角度整理 Star 列表。',
    faq: [
      {
        question: '这页更适合谁？',
        answer: '适合需要提效、编排任务、减少重复劳动的个人开发者和工具使用者。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'automation',
      'workflow',
      'orchestration',
      'workflow-automation',
      'browser-automation',
    ]) || includesAny(signals.text, ['automation', 'workflow', 'automate']),
  },
  {
    slug: 'ui-building',
    name: 'UI 构建',
    title: '适合 UI 与前端构建的开源项目',
    description: '自动聚合 UI 组件、设计系统、shadcn、React 组件库和界面工具，适合作为前端搭建类项目入口。',
    faq: [
      {
        question: '会包含哪些项目？',
        answer: '主要是 UI 组件库、设计系统、界面生成工具以及与前端搭建强相关的仓库。',
      },
    ],
    matches: (_, signals) => signals.projectType === 'ui'
      || hasAnyTopic(signals.topics, ['ui', 'component', 'components', 'design-system', 'shadcn'])
      || includesAny(signals.text, ['component library', 'ui component', 'design system']),
  },
  {
    slug: 'developer-productivity',
    name: '开发提效',
    title: '适合开发提效的开源项目',
    description: '自动聚合 developer tools、productivity、terminal、context management 等工具，适合从效率视角回看过去收藏的项目。',
    faq: [
      {
        question: '为什么适合 SEO？',
        answer: '开发提效是长期稳定的搜索需求，也非常适合做站内推荐与回访入口。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'developer-tools',
      'devtools',
      'productivity',
      'terminal',
      'context-management',
    ]) || includesAny(signals.text, ['developer tools', 'productivity', 'terminal']),
  },
];

const projectTypeLabelMap: Record<string, string> = {
  app: '应用项目',
  library: '库 / SDK',
  cli: 'CLI 工具',
  plugin: '插件 / 扩展',
  ui: 'UI 组件库',
  template: '模板 / Starter',
  docs: '文档型项目',
  'awesome-list': '资源合集',
  content: '内容型项目',
  config: '配置型项目',
};

export function parseTopics(topics: string | null | undefined) {
  if (!topics) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(topics) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function slugifyTaxonomyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getLanguageBuckets(limit = 12): TaxonomyBucket[] {
  const rows = db.prepare(`
    SELECT language, COUNT(*) as count
    FROM projects
    WHERE language IS NOT NULL AND TRIM(language) != ''
    GROUP BY language
    ORDER BY count DESC, language ASC
  `).all() as Array<{ language: string; count: number }>;

  return rows.slice(0, limit).map((row) => ({
    name: row.language,
    slug: slugifyTaxonomyValue(row.language),
    count: row.count,
  }));
}

export function getTopicBuckets(limit = 18): TaxonomyBucket[] {
  const rows = db.prepare('SELECT topics FROM projects WHERE topics IS NOT NULL AND topics != ?').all('[]') as RawTopicRow[];
  const topicCount = new Map<string, number>();

  rows.forEach((row) => {
    parseTopics(row.topics).forEach((topic) => {
      topicCount.set(topic, (topicCount.get(topic) || 0) + 1);
    });
  });

  return [...topicCount.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name, count]) => ({
      name,
      slug: slugifyTaxonomyValue(name),
      count,
    }));
}

function getProjectsBase() {
  return db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.description,
      p.one_line_intro,
      p.stars,
      p.language,
      p.one_line_status,
      p.topics,
      p.project_type,
      pa.semantic_data,
      pa.analysis_data,
      pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.one_line_status = 'completed'
      AND p.intro_status = 'completed'
      AND p.wiki_status = 'completed'
    ORDER BY p.stars DESC, p.synced_at DESC
  `).all() as SpecialCollectionProjectRow[];
}

function getSemanticProfileFromProject(project: SpecialCollectionProjectRow) {
  return parseJson<ProjectSemanticProfile>(project.semantic_data)
    || deriveProjectSemanticProfile({
      projectName: project.full_name,
      description: project.description,
      projectType: project.project_type,
      topics: parseTopics(project.topics),
      oneLineIntro: project.one_line_intro,
      analysis: parseJson<RepositoryAnalysisResult>(project.analysis_data),
      deepRead: parseJson<RepositoryDeepReadResult>(project.deep_read_data),
    });
}

function normalizeUseCaseKey(value: string) {
  return normalizeText(value);
}

function toProjectListItem(project: SpecialCollectionProjectRow): ProjectListItem {
  return {
    id: project.id,
    full_name: project.full_name,
    description: project.description,
    one_line_intro: project.one_line_intro,
    stars: project.stars,
    language: project.language,
    one_line_status: project.one_line_status,
    project_type: project.project_type,
  };
}

function getProjectsForDefinition(definition: SpecialCollectionDefinition) {
  return getProjectsBase()
    .filter((project) => definition.matches(project, buildSignals(project)))
    .map(toProjectListItem);
}

void specialCollectionDefinitions;
void useCaseDefinitions;
void getProjectsForDefinition;

export function getProjectsByLanguageSlug(slug: string) {
  const bucket = getLanguageBuckets(1000).find((item) => item.slug === slug);
  if (!bucket) {
    return null;
  }

  const projects = db.prepare(`
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, project_type
    FROM projects
    WHERE language = ?
    ORDER BY stars DESC, synced_at DESC
  `).all(bucket.name) as ProjectListItem[];

  return {
    bucket,
    projects,
  };
}

export function getProjectsByTopicSlug(slug: string) {
  const bucket = getTopicBuckets(5000).find((item) => item.slug === slug);
  if (!bucket) {
    return null;
  }

  const projects = getProjectsBase().filter((project) =>
    parseTopics(project.topics).some((topic) => slugifyTaxonomyValue(topic) === slug)
  );

  return {
    bucket,
    projects: projects.map(toProjectListItem),
  };
}

export function getSpecialCollectionBuckets(limit = 12): SpecialCollectionBucket[] {
  const projects = getProjectsBase();

  return SEMANTIC_CLUSTER_DEFINITIONS
    .map((cluster) => {
      const count = projects.filter((project) => getSemanticProfileFromProject(project).primaryCluster === cluster.id).length;
      return {
        name: cluster.label,
        slug: cluster.id,
        count,
        title: `${cluster.label} 开源项目`,
        description: cluster.description,
        href: `/collections/${cluster.id}`,
      };
    })
    .filter((bucket) => bucket.count > 0)
    .slice(0, limit);
}

export function getProjectsBySpecialCollectionSlug(slug: string) {
  const clusterLookup = getSemanticClusterLookup();
  const cluster = clusterLookup.get(slug);
  if (!cluster) {
    return null;
  }

  const projects = getProjectsBase()
    .filter((project) => getSemanticProfileFromProject(project).primaryCluster === slug)
    .map(toProjectListItem);

  if (projects.length === 0) {
    return null;
  }

  return {
    bucket: {
      name: cluster.label,
      slug,
      count: projects.length,
      title: `${cluster.label} 开源项目`,
      description: cluster.description,
      href: `/collections/${slug}`,
    },
    projects,
  };
}

export function getProjectTypeBuckets(limit = 12): SpecialCollectionBucket[] {
  const rows = db.prepare(`
    SELECT project_type, COUNT(*) as count
    FROM projects
    WHERE project_type IS NOT NULL AND TRIM(project_type) != '' AND project_type != 'unknown'
      AND one_line_status = 'completed'
      AND intro_status = 'completed'
      AND wiki_status = 'completed'
    GROUP BY project_type
    ORDER BY count DESC, project_type ASC
  `).all() as Array<{ project_type: string; count: number }>;

  return rows
    .filter((row) => projectTypeLabelMap[row.project_type])
    .slice(0, limit)
    .map((row) => ({
      name: projectTypeLabelMap[row.project_type],
      slug: slugifyTaxonomyValue(row.project_type),
      count: row.count,
      title: `${projectTypeLabelMap[row.project_type]} 开源项目`,
      description: `自动聚合站内已识别为“${projectTypeLabelMap[row.project_type]}”的项目，适合按项目形态重新整理 Star 列表。`,
      href: `/types/${slugifyTaxonomyValue(row.project_type)}`,
    }));
}

export function getProjectsByProjectTypeSlug(slug: string) {
  const rows = getProjectTypeBuckets(100);
  const bucket = rows.find((item) => item.slug === slug);
  if (!bucket) {
    return null;
  }

  const rawProjectType = bucket.slug;
  const projects = db.prepare(`
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, project_type
    FROM projects
    WHERE LOWER(project_type) = ?
      AND one_line_status = 'completed'
      AND intro_status = 'completed'
      AND wiki_status = 'completed'
    ORDER BY stars DESC, synced_at DESC
  `).all(rawProjectType) as ProjectListItem[];

  return { bucket, projects };
}

export function getUseCaseBuckets(limit = 12): SpecialCollectionBucket[] {
  const projects = getProjectsBase();
  const buckets = new Map<string, { name: string; count: number }>();

  projects.forEach((project) => {
    getSemanticProfileFromProject(project).useCases.forEach((useCase) => {
      const name = useCase.trim();
      const key = normalizeUseCaseKey(name);
      if (!name || !key) {
        return;
      }

      const current = buckets.get(key);
      buckets.set(key, {
        name: current?.name || name,
        count: (current?.count || 0) + 1,
      });
    });
  });

  return [...buckets.entries()]
    .map(([, value]) => ({
      name: value.name,
      slug: slugifyTaxonomyValue(value.name),
      count: value.count,
      title: `${value.name} 相关开源项目`,
      description: `自动聚合站内已分析完成、并被识别与“${value.name}”相关的 GitHub Star 项目。`,
      href: `/use-cases/${slugifyTaxonomyValue(value.name)}`,
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
}

export function getProjectsByUseCaseSlug(slug: string) {
  const bucket = getUseCaseBuckets(500).find((item) => item.slug === slug);
  if (!bucket) {
    return null;
  }

  const normalizedName = normalizeUseCaseKey(bucket.name);
  const projects = getProjectsBase()
    .filter((project) => getSemanticProfileFromProject(project).useCases.some((item) => normalizeUseCaseKey(item) === normalizedName))
    .map(toProjectListItem);

  if (projects.length === 0) {
    return null;
  }

  return {
    bucket: {
      ...bucket,
      count: projects.length,
    },
    projects,
  };
}

export function getMatchingSpecialCollectionsForProject(projectId: number) {
  const project = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.description,
      p.one_line_intro,
      p.stars,
      p.language,
      p.one_line_status,
      p.topics,
      p.project_type,
      pa.semantic_data,
      pa.analysis_data,
      pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.id = ?
  `).get(projectId) as SpecialCollectionProjectRow | undefined;

  if (!project) {
    return [] as SpecialCollectionBucket[];
  }

  const profile = getSemanticProfileFromProject(project);
  const cluster = getSemanticClusterLookup().get(profile.primaryCluster);
  if (!cluster) {
    return [] as SpecialCollectionBucket[];
  }

  return [{
      name: cluster.label,
      slug: cluster.id,
      count: 0,
      title: `${cluster.label} 开源项目`,
      description: cluster.description,
      href: `/collections/${cluster.id}`,
    }];
}

export function getMatchingUseCasesForProject(projectId: number) {
  const project = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.description,
      p.one_line_intro,
      p.stars,
      p.language,
      p.one_line_status,
      p.topics,
      p.project_type,
      pa.semantic_data,
      pa.analysis_data,
      pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.id = ?
  `).get(projectId) as SpecialCollectionProjectRow | undefined;

  if (!project) {
    return [] as SpecialCollectionBucket[];
  }

  return getSemanticProfileFromProject(project).useCases.map((useCase) => ({
      name: useCase,
      slug: slugifyTaxonomyValue(useCase),
      count: 0,
      title: `${useCase} 相关开源项目`,
      description: `查看站内与“${useCase}”相关的已分析 GitHub Star 项目。`,
      href: `/use-cases/${slugifyTaxonomyValue(useCase)}`,
    }));
}

export function getProjectTypeLinkForProject(projectId: number) {
  const project = db.prepare(`
    SELECT project_type
    FROM projects
    WHERE id = ?
  `).get(projectId) as { project_type: string | null } | undefined;

  if (!project?.project_type || project.project_type === 'unknown') {
    return null;
  }

  const slug = slugifyTaxonomyValue(project.project_type);
  const label = projectTypeLabelMap[project.project_type];

  if (!label) {
    return null;
  }

  return {
    slug,
    title: `${label} 开源项目`,
    href: `/types/${slug}`,
  };
}

export function getRelatedProjects(projectId: number, limit = 6) {
  const current = db.prepare(`
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, topics, project_type,
           pa.semantic_data, pa.analysis_data, pa.deep_read_data
    FROM projects
    LEFT JOIN project_analysis pa ON pa.project_id = projects.id
    WHERE id = ?
  `).get(projectId) as RelatedProjectRow | undefined;

  if (!current) {
    return [] as RelatedProjectItem[];
  }

  const clusterLookup = getSemanticClusterLookup();
  const currentProfile = parseJson<ProjectSemanticProfile>(current.semantic_data)
    || deriveProjectSemanticProfile({
      projectName: current.full_name,
      description: current.description,
      projectType: current.project_type,
      topics: parseTopics(current.topics),
      oneLineIntro: current.one_line_intro,
      analysis: parseJson<RepositoryAnalysisResult>(current.analysis_data),
      deepRead: parseJson<RepositoryDeepReadResult>(current.deep_read_data),
    });
  const currentTopics = parseTopics(current.topics);

  const projects = db.prepare(`
    SELECT p.id, p.full_name, p.description, p.one_line_intro, p.stars, p.language, p.one_line_status, p.topics, p.project_type,
           pa.semantic_data, pa.analysis_data, pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.id != ?
    ORDER BY p.stars DESC, p.synced_at DESC
  `).all(projectId) as RelatedProjectRow[];

  return projects
    .map((project) => {
      const projectTopics = parseTopics(project.topics);
      const profile = parseJson<ProjectSemanticProfile>(project.semantic_data)
        || deriveProjectSemanticProfile({
          projectName: project.full_name,
          description: project.description,
          projectType: project.project_type,
          topics: projectTopics,
          oneLineIntro: project.one_line_intro,
          analysis: parseJson<RepositoryAnalysisResult>(project.analysis_data),
          deepRead: parseJson<RepositoryDeepReadResult>(project.deep_read_data),
        });

      const reasons = new Set<string>();
      let score = 0;

      if (currentProfile.primaryCluster === profile.primaryCluster) {
        const cluster = clusterLookup.get(profile.primaryCluster);
        reasons.add(`同属 ${cluster?.label || profile.primaryCluster}`);
        score += 8;
      }

      const sharedTags = intersectNormalized(currentProfile.semanticTags, profile.semanticTags).slice(0, 2);
      if (sharedTags.length > 0) {
        sharedTags.forEach((tag) => {
          const cluster = clusterLookup.get(tag);
          reasons.add(`都和 ${cluster?.label || tag} 相关`);
        });
        score += sharedTags.length * 3;
      }

      const sharedUseCases = intersectNormalized(currentProfile.useCases, profile.useCases).slice(0, 2);
      if (sharedUseCases.length > 0) {
        reasons.add(`用途接近：${sharedUseCases.join(' / ')}`);
        score += sharedUseCases.length * 4;
      }

      const sharedKeywords = intersectNormalized(currentProfile.keywords, profile.keywords).slice(0, 3);
      if (sharedKeywords.length > 0) {
        reasons.add(`关键词重合：${sharedKeywords.join(' / ')}`);
        score += sharedKeywords.length * 2;
      }

      const sharedTopics = intersectNormalized(currentTopics, projectTopics).slice(0, 2);
      if (sharedTopics.length > 0) {
        reasons.add(`Topic 交集：${sharedTopics.join(' / ')}`);
        score += sharedTopics.length;
      }

      if (current.project_type && project.project_type && current.project_type === project.project_type) {
        reasons.add('项目形态接近');
        score += 1;
      }

      return {
        score,
        project: {
          ...toProjectListItem(project),
          reason: [...reasons].slice(0, 3),
          score,
        } satisfies RelatedProjectItem,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.project.stars - left.project.stars)
    .slice(0, limit)
    .map((item) => item.project);
}

export function getSitemapTaxonomies() {
  return {
    languages: getLanguageBuckets(500),
    topics: getTopicBuckets(1000),
    specialCollections: getSpecialCollectionBuckets(100),
    projectTypes: getProjectTypeBuckets(100),
    useCases: getUseCaseBuckets(100),
  };
}
