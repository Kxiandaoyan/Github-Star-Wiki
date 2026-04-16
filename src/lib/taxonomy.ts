import { getCached } from './cache';
import db from './db';
import type { RepositoryAnalysisResult, RepositoryDeepReadResult } from './project-analysis';
import {
  deriveProjectSemanticProfile,
  getSemanticClusterLookup,
  resolveClusterId,
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
  updated_at?: string | null;
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

function dedupeStrings(values: string[], limit: number) {
  const result: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const trimmed = value.trim();
    const normalized = normalizeText(trimmed);

    if (!trimmed || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(trimmed);
  });

  return result.slice(0, limit);
}

const ignoredFunctionalPhrases = new Set([
  '开源项目',
  '项目介绍',
  '项目说明',
  '仓库说明',
  '工具',
  '项目',
  '应用',
  '平台',
  '当前仓库信息不足',
  '暂时无法准确提炼其核心问题',
  '当前仓库信息不足，暂时无法准确提炼其核心问题',
]);

function extractFunctionalPhrases(value: string | null | undefined, limit: number) {
  return dedupeStrings(
    (value || '')
      .split(/[，。；;、,.!?\n|/]+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2 && part.length <= 32)
      .filter((part) => !ignoredFunctionalPhrases.has(part)),
    limit
  );
}

function buildFunctionalIntentTerms(profile: ProjectSemanticProfile) {
  return dedupeStrings([
    ...profile.useCases,
    ...profile.capabilities,
    ...extractFunctionalPhrases(profile.problemSolved, 3),
    ...extractFunctionalPhrases(profile.summary, 2),
  ], 10);
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

const useCaseDefinitions: SpecialCollectionDefinition[] = [
  // AI 相关
  {
    slug: 'ai-agent-development',
    name: 'AI Agent 开发',
    title: '适合 AI Agent 开发的开源项目',
    description: '用于构建智能体、多代理系统、MCP 服务器、Claude Code / Codex / Cursor 扩展、自主任务执行的工具和框架。',
    faq: [
      {
        question: '这里会包含哪些项目？',
        answer: '涵盖 AI Agent 框架、MCP 服务器、Agent 开发脚手架、Claude Code/Codex 插件等。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'agent', 'agents', 'ai-agent', 'ai-agents', 'mcp', 'mcp-server', 'multi-agent', 'agentic', 'claude-code', 'codex',
    ]) || includesAny(signals.text, ['ai agent', 'mcp server', 'multi-agent', 'claude code', 'codex', 'agent framework']),
  },
  {
    slug: 'chatbot-building',
    name: '聊天机器人',
    title: '适合构建聊天机器人的开源项目',
    description: '用于开发对话系统、客服机器人、AI 助手的框架和工具，涵盖 OpenAI、Claude、Gemini、DeepSeek 等模型接入。',
    faq: [
      {
        question: '和 AI Agent 有什么区别？',
        answer: 'Agent 强调自主决策与工具调用，聊天机器人更偏对话交互本身。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'chatbot', 'chat', 'conversation', 'assistant', 'telegram-bot', 'discord-bot', 'wechat',
    ]) || includesAny(signals.text, ['chatbot', 'chat bot', 'conversation', 'dialogue system']),
  },
  {
    slug: 'rag-implementation',
    name: 'RAG 实现',
    title: '适合实现 RAG 的开源项目',
    description: '用于构建检索增强生成系统、向量检索、知识库问答、文档智能的工具和框架。',
    faq: [
      {
        question: 'RAG 项目通常包含什么？',
        answer: '典型能力包括文档分块、embedding、向量存储、语义检索、上下文组装与回答生成。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'rag', 'retrieval', 'vector', 'vector-search', 'embedding', 'semantic-search', 'knowledge-base',
    ]) || includesAny(signals.text, ['rag', 'retrieval augmented', 'vector database', 'semantic search']),
  },
  {
    slug: 'model-training',
    name: '模型训练',
    title: '适合模型训练的开源项目',
    description: '用于机器学习训练、模型微调、数据集处理、推理加速的工具和框架。',
    faq: [
      {
        question: '新手适合从哪里开始？',
        answer: '先看高 star 的训练框架，再结合数据集和微调脚本逐步深入。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'training', 'fine-tuning', 'dataset', 'machine-learning', 'deep-learning', 'pytorch', 'tensorflow',
    ]) || includesAny(signals.text, ['fine-tuning', 'model training', 'machine learning', 'pytorch', 'tensorflow']),
  },

  // 自动化
  {
    slug: 'workflow-automation',
    name: '工作流自动化',
    title: '适合工作流自动化的开源项目',
    description: '用于任务编排、流程自动化、定时任务、RPA、可视化工作流构建的工具。',
    faq: [
      {
        question: '适合什么人？',
        answer: '适合想减少重复劳动、串联工具、做数据或流程自动化的开发者和运营。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'automation', 'workflow', 'workflow-automation', 'orchestration', 'rpa', 'agentic-workflow',
    ]) || includesAny(signals.text, ['workflow automation', 'task automation', 'orchestration']),
  },
  {
    slug: 'web-scraping',
    name: '网页数据采集',
    title: '适合网页数据采集的开源项目',
    description: '用于爬虫开发、数据抓取、网页解析、反爬对抗的工具和框架。',
    faq: [
      {
        question: '这些项目合法吗？',
        answer: '技术本身中立，使用时请遵守目标站点的 robots.txt、服务条款和当地法律。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'scraper', 'crawler', 'scraping', 'web-scraping', 'spider', 'data-extraction',
    ]) || includesAny(signals.text, ['web scraping', 'scraper', 'crawler', 'data extraction']),
  },
  {
    slug: 'browser-testing',
    name: '浏览器测试',
    title: '适合浏览器自动化测试的开源项目',
    description: '用于 E2E 测试、UI 测试、浏览器自动化的工具，涵盖 Puppeteer、Playwright、Selenium。',
    faq: [
      {
        question: '选 Puppeteer 还是 Playwright？',
        answer: 'Playwright 跨浏览器支持更好，Puppeteer 更偏 Chrome 生态；看目标浏览器和 API 偏好。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'puppeteer', 'playwright', 'selenium', 'browser-automation', 'e2e', 'testing',
    ]) || includesAny(signals.text, ['puppeteer', 'playwright', 'selenium', 'e2e testing', 'browser test']),
  },

  // 前端
  {
    slug: 'ui-development',
    name: 'UI 开发',
    title: '适合 UI 开发的开源项目',
    description: '用于构建用户界面、组件库、设计系统、shadcn 扩展和界面生成工具。',
    faq: [
      {
        question: '会包含哪些项目？',
        answer: '组件库（shadcn/Radix/MUI）、设计系统、Tailwind 插件、UI Kit 等。',
      },
    ],
    matches: (_, signals) => signals.projectType === 'ui'
      || hasAnyTopic(signals.topics, ['ui', 'component', 'components', 'design-system', 'shadcn', 'tailwind', 'radix-ui'])
      || includesAny(signals.text, ['component library', 'design system', 'ui components', 'shadcn']),
  },
  {
    slug: 'frontend-building',
    name: '前端应用搭建',
    title: '适合前端应用搭建的开源项目',
    description: '用于快速搭建前端应用、SPA、SSR 应用的框架、模板和脚手架。',
    faq: [
      {
        question: '推荐的起步路径？',
        answer: 'Next.js/Nuxt 适合全栈，Vite + React/Vue 适合纯 SPA，按需求选模板。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'react', 'vue', 'nextjs', 'next-js', 'nuxt', 'svelte', 'frontend', 'vite',
    ]) || includesAny(signals.text, ['next.js', 'nextjs', 'nuxt', 'react app', 'vue app', 'svelte']),
  },
  {
    slug: 'animation-effects',
    name: '动画与特效',
    title: '适合实现动画特效的开源项目',
    description: '用于创建动画、过渡效果、交互体验的库和工具（Framer Motion、GSAP、Lottie 等）。',
    faq: [
      {
        question: '这类库的主要取舍？',
        answer: '看你要的是声明式 API、高性能物理引擎，还是复杂的关键帧动画。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'animation', 'motion', 'transition', 'framer-motion', 'gsap', 'lottie',
    ]) || includesAny(signals.text, ['animation library', 'motion', 'transition', 'framer motion']),
  },

  // 后端
  {
    slug: 'api-development',
    name: 'API 开发',
    title: '适合 API 开发的开源项目',
    description: '用于构建 REST API、GraphQL API、微服务的框架和工具（Express、FastAPI、Nest、tRPC 等）。',
    faq: [
      {
        question: '如何选型？',
        answer: '小项目用 Express/FastAPI，复杂业务用 Nest/Spring，类型安全选 tRPC。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'api', 'rest', 'graphql', 'backend', 'express', 'fastapi', 'nestjs', 'trpc',
    ]) || includesAny(signals.text, ['rest api', 'graphql', 'backend framework', 'microservices']),
  },
  {
    slug: 'database-management',
    name: '数据库管理',
    title: '适合数据库管理的开源项目',
    description: '用于数据库操作、ORM、查询构建、数据迁移的工具和库。',
    faq: [
      {
        question: 'ORM 和原生 SQL 怎么选？',
        answer: '小团队/原型用 ORM 省事，复杂报表/大数据场景偏原生 SQL 或查询构建器。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'database', 'orm', 'sql', 'postgres', 'mysql', 'redis', 'sqlite', 'mongodb', 'prisma',
    ]) || includesAny(signals.text, ['database', 'orm', 'query builder', 'prisma', 'typeorm']),
  },
  {
    slug: 'authentication-setup',
    name: '认证授权',
    title: '适合实现认证授权的开源项目',
    description: '用于用户认证、权限管理、SSO、OAuth 的开源解决方案。',
    faq: [
      {
        question: '这类项目适合自己搭吗？',
        answer: '简单场景建议用托管服务，独立部署/合规要求高的场景可以自托管开源方案。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'auth', 'authentication', 'authorization', 'sso', 'oauth', 'jwt', 'oidc',
    ]) || includesAny(signals.text, ['authentication', 'oauth', 'sso', 'jwt', 'identity provider']),
  },

  // DevOps
  {
    slug: 'deployment',
    name: '应用部署',
    title: '适合应用部署的开源项目',
    description: '用于应用部署、容器化、云原生部署的工具和平台（Docker、Kubernetes、PaaS 自托管等）。',
    faq: [
      {
        question: '小项目有必要上 K8s 吗？',
        answer: '多数小项目用 Docker Compose 或 PaaS 即可；有多环境和规模化需求再考虑 K8s。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'docker', 'kubernetes', 'k8s', 'deployment', 'cloud', 'self-hosted', 'paas',
    ]) || includesAny(signals.text, ['docker', 'kubernetes', 'deployment', 'self-hosted']),
  },
  {
    slug: 'cicd-pipeline',
    name: 'CI/CD 流水线',
    title: '适合构建 CI/CD 流水线的开源项目',
    description: '用于持续集成、持续部署、自动化测试与发布的工具。',
    faq: [
      {
        question: '应该从哪里入手？',
        answer: '先用 GitHub Actions 把 lint/test/build 打通，再逐步加上自动化部署与灰度发布。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'ci', 'cd', 'cicd', 'ci-cd', 'github-actions', 'gitlab-ci', 'pipeline',
    ]) || includesAny(signals.text, ['ci/cd', 'github actions', 'gitlab ci', 'continuous integration']),
  },
  {
    slug: 'system-monitoring',
    name: '系统监控',
    title: '适合系统监控的开源项目',
    description: '用于监控、日志、告警、APM、可观测性的工具和平台。',
    faq: [
      {
        question: '监控和日志有什么区别？',
        answer: '监控看整体指标与告警，日志看细节事件，APM 关联请求链路。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'monitoring', 'observability', 'logging', 'metrics', 'tracing', 'prometheus', 'grafana',
    ]) || includesAny(signals.text, ['monitoring', 'observability', 'logging', 'apm', 'prometheus']),
  },

  // 开发提效
  {
    slug: 'developer-productivity',
    name: '开发提效',
    title: '适合提升开发效率的开源项目',
    description: '用于提升开发效率、代码质量、团队协作的工具（CLI、Linter、Formatter、脚手架、编辑器扩展）。',
    faq: [
      {
        question: '哪些值得直接装？',
        answer: '高 star 的 Linter/Formatter、通用脚手架、热门终端工具通常通用性最好。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'developer-tools', 'devtools', 'productivity', 'cli', 'terminal', 'linter', 'formatter', 'vscode-extension',
    ]) || includesAny(signals.text, ['developer tools', 'productivity', 'cli tool', 'terminal']),
  },

  // 安全
  {
    slug: 'security-tooling',
    name: '安全与红队',
    title: '适合安全与红队研究的开源项目',
    description: '渗透测试、漏洞研究、rootkit、反向 shell、反检测、C2 框架与安全自动化工具。',
    faq: [
      {
        question: '合法使用的前提？',
        answer: '仅在授权范围内使用，遵守法律法规与负责任披露流程。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'security', 'pentest', 'pentesting', 'red-team', 'rootkit', 'reverse-shell', 'c2', 'exploit',
    ]) || includesAny(signals.text, ['pentest', 'red team', 'rootkit', 'reverse shell', 'c2 framework']),
  },

  // 内容
  {
    slug: 'content-management',
    name: '内容管理',
    title: '适合内容管理的开源项目',
    description: '用于内容管理、博客搭建、文档站的 CMS 和工具（Strapi、Ghost、静态站生成器）。',
    faq: [
      {
        question: '选 Headless 还是传统 CMS？',
        answer: '需要前端独立部署/多端分发选 Headless，开箱即用选传统 CMS。',
      },
    ],
    matches: (_, signals) => hasAnyTopic(signals.topics, [
      'cms', 'content-management', 'blog', 'docs', 'documentation', 'static-site-generator',
    ]) || includesAny(signals.text, ['cms', 'headless cms', 'blog engine', 'static site generator']),
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
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
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
  const all = getCached('taxonomy:topic-buckets-all', 60_000, () => {
    const rows = db.prepare('SELECT topics FROM projects WHERE topics IS NOT NULL AND topics != ?').all('[]') as RawTopicRow[];
    const topicCount = new Map<string, number>();

    rows.forEach((row) => {
      parseTopics(row.topics).forEach((topic) => {
        topicCount.set(topic, (topicCount.get(topic) || 0) + 1);
      });
    });

    return [...topicCount.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([name, count]) => ({
        name,
        slug: slugifyTaxonomyValue(name),
        count,
      }));
  });

  return all.slice(0, limit);
}

function getProjectsBase() {
  return getCached('taxonomy:projects-base', 60_000, () =>
    db.prepare(`
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
        p.updated_at,
        pa.semantic_data,
        pa.analysis_data,
        pa.deep_read_data
      FROM projects p
      LEFT JOIN project_analysis pa ON pa.project_id = p.id
      WHERE p.one_line_status = 'completed'
        AND p.intro_status = 'completed'
        AND p.wiki_status = 'completed'
      ORDER BY p.stars DESC, p.synced_at DESC
    `).all() as SpecialCollectionProjectRow[]
  );
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
    updated_at: project.updated_at,
  };
}

function getProjectsForDefinition(definition: SpecialCollectionDefinition) {
  return getProjectsBase()
    .filter((project) => definition.matches(project, buildSignals(project)))
    .map(toProjectListItem);
}

function dedupeSpecialCollectionBuckets(items: SpecialCollectionBucket[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const slug = item.slug.trim().toLowerCase();
    if (!slug || seen.has(slug)) {
      return false;
    }

    seen.add(slug);
    return true;
  });
}

function getUseCaseBucketsFromDefinitions() {
  return dedupeSpecialCollectionBuckets(
    useCaseDefinitions
      .map((definition) => {
        const count = getProjectsForDefinition(definition).length;

        return {
          name: definition.name,
          slug: definition.slug,
          count,
          title: definition.title,
          description: definition.description,
          href: `/use-cases/${definition.slug}`,
        } satisfies SpecialCollectionBucket;
      })
      .filter((bucket) => bucket.count > 0)
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
  );
}


export function getProjectsByLanguageSlug(slug: string) {
  const bucket = getLanguageBuckets(1000).find((item) => item.slug === slug);
  if (!bucket) {
    return null;
  }

  const projects = db.prepare(`
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, project_type, updated_at
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

  const projects = db.prepare(`
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, topics, project_type, updated_at
    FROM projects
    WHERE topics LIKE ?
    ORDER BY stars DESC, synced_at DESC
  `).all(`%${bucket.name}%`) as Array<ProjectListItem & { topics?: string | null }>;

  return {
    bucket,
    projects: projects
      .filter((project) =>
        parseTopics(project.topics).some((topic) => slugifyTaxonomyValue(topic) === slug)
      )
      .map((project) => ({
        id: project.id,
        full_name: project.full_name,
        description: project.description,
        one_line_intro: project.one_line_intro,
        stars: project.stars,
        language: project.language,
        one_line_status: project.one_line_status,
        project_type: project.project_type,
        updated_at: project.updated_at,
      })),
  };
}

export function getSpecialCollectionBuckets(limit = 24): SpecialCollectionBucket[] {
  const projects = getProjectsBase();
  const clusterCounts = new Map<string, number>();

  projects.forEach((project) => {
    const profile = getSemanticProfileFromProject(project);
    const resolved = resolveClusterId(profile.primaryCluster);
    clusterCounts.set(resolved, (clusterCounts.get(resolved) || 0) + 1);
  });

  return SEMANTIC_CLUSTER_DEFINITIONS
    .map((cluster) => ({
      name: cluster.label,
      slug: cluster.id,
      count: clusterCounts.get(cluster.id) || 0,
      title: `${cluster.label} 开源项目`,
      description: cluster.description,
      href: `/collections/${cluster.id}`,
    }))
    .filter((bucket) => bucket.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
}

export function getProjectsBySpecialCollectionSlug(slug: string) {
  const clusterLookup = getSemanticClusterLookup();
  const cluster = clusterLookup.get(slug);
  if (!cluster) {
    return null;
  }

  const resolvedSlug = resolveClusterId(slug);
  const projects = getProjectsBase()
    .filter((project) => resolveClusterId(getSemanticProfileFromProject(project).primaryCluster) === resolvedSlug)
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
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, project_type, updated_at
    FROM projects
    WHERE LOWER(project_type) = ?
    ORDER BY stars DESC, synced_at DESC
  `).all(rawProjectType) as ProjectListItem[];

  return { bucket, projects };
}

export function getUseCaseBuckets(limit = 12): SpecialCollectionBucket[] {
  return getUseCaseBucketsFromDefinitions().slice(0, limit);
}

export function getProjectsByUseCaseSlug(slug: string) {
  const definition = useCaseDefinitions.find((item) => item.slug === slug);
  if (!definition) {
    return null;
  }

  const projects = getProjectsForDefinition(definition);

  if (projects.length === 0) {
    return null;
  }

  return {
    bucket: {
      name: definition.name,
      slug: definition.slug,
      count: projects.length,
      title: definition.title,
      description: definition.description,
      href: `/use-cases/${definition.slug}`,
    } satisfies SpecialCollectionBucket,
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
  const clusterLookup = getSemanticClusterLookup();
  const candidateIds = Array.from(new Set([
    resolveClusterId(profile.primaryCluster),
    ...profile.semanticTags.map((tag) => resolveClusterId(tag)),
  ]));

  return candidateIds
    .map((id) => {
      const cluster = clusterLookup.get(id);
      if (!cluster) return null;
      return {
        name: cluster.label,
        slug: cluster.id,
        count: 0,
        title: `${cluster.label} 开源项目`,
        description: cluster.description,
        href: `/collections/${cluster.id}`,
      } satisfies SpecialCollectionBucket;
    })
    .filter((item): item is SpecialCollectionBucket => item !== null)
    .slice(0, 4);
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

  const signals = buildSignals(project);

  return useCaseDefinitions
    .filter((definition) => definition.matches(project, signals))
    .map((definition) => ({
      name: definition.name,
      slug: definition.slug,
      count: 0,
      title: definition.title,
      description: definition.description,
      href: `/use-cases/${definition.slug}`,
    } satisfies SpecialCollectionBucket));
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
  const currentFunctionalIntentTerms = buildFunctionalIntentTerms(currentProfile);
  const currentProblemSignals = extractFunctionalPhrases(currentProfile.problemSolved, 3);

  const topicTerms = currentTopics.slice(0, 5).map((t) => `%${t}%`);
  const clusterTerm = currentProfile.primaryCluster ? `%${currentProfile.primaryCluster}%` : null;
  const keywordTerms = currentProfile.keywords.slice(0, 3).map((k) => `%${k}%`);
  const filterTerms = [...topicTerms, ...keywordTerms, ...(clusterTerm ? [clusterTerm] : [])];

  let candidateSql: string;
  const candidateParams: (string | number)[] = [projectId];

  if (filterTerms.length > 0) {
    const likeConditions = filterTerms.map(() => '(p.topics LIKE ? OR pa.semantic_data LIKE ?)');
    candidateSql = `
      SELECT p.id, p.full_name, p.description, p.one_line_intro, p.stars, p.language, p.one_line_status, p.topics, p.project_type,
             pa.semantic_data, pa.analysis_data, pa.deep_read_data
      FROM projects p
      LEFT JOIN project_analysis pa ON pa.project_id = p.id
      WHERE p.id != ? AND (${likeConditions.join(' OR ')})
      ORDER BY p.stars DESC
      LIMIT 200
    `;
    for (const term of filterTerms) {
      candidateParams.push(term, term);
    }
  } else {
    candidateSql = `
      SELECT p.id, p.full_name, p.description, p.one_line_intro, p.stars, p.language, p.one_line_status, p.topics, p.project_type,
             pa.semantic_data, pa.analysis_data, pa.deep_read_data
      FROM projects p
      LEFT JOIN project_analysis pa ON pa.project_id = p.id
      WHERE p.id != ?
      ORDER BY p.stars DESC
      LIMIT 200
    `;
  }

  const projects = db.prepare(candidateSql).all(...candidateParams) as RelatedProjectRow[];

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
      const projectFunctionalIntentTerms = buildFunctionalIntentTerms(profile);
      const projectProblemSignals = extractFunctionalPhrases(profile.problemSolved, 3);

      const reasons = new Set<string>();
      let score = 0;
      let functionalScore = 0;

      const sharedUseCases = intersectNormalized(currentProfile.useCases, profile.useCases).slice(0, 3);
      if (sharedUseCases.length > 0) {
        reasons.add(`用途接近：${sharedUseCases.join(' / ')}`);
        score += sharedUseCases.length * 7;
        functionalScore += sharedUseCases.length * 7;
      }

      const sharedCapabilities = intersectNormalized(currentProfile.capabilities, profile.capabilities).slice(0, 3);
      if (sharedCapabilities.length > 0) {
        reasons.add(`能力相近：${sharedCapabilities.join(' / ')}`);
        score += sharedCapabilities.length * 5;
        functionalScore += sharedCapabilities.length * 5;
      }

      const sharedProblemSignals = intersectNormalized(currentProblemSignals, projectProblemSignals).slice(0, 2);
      if (sharedProblemSignals.length > 0) {
        reasons.add(`解决问题接近：${sharedProblemSignals.join(' / ')}`);
        score += sharedProblemSignals.length * 4;
        functionalScore += sharedProblemSignals.length * 4;
      }

      const sharedIntentTerms = intersectNormalized(currentFunctionalIntentTerms, projectFunctionalIntentTerms).slice(0, 3);
      if (sharedIntentTerms.length > 0) {
        reasons.add(`功能意图重合：${sharedIntentTerms.join(' / ')}`);
        score += sharedIntentTerms.length * 3;
        functionalScore += sharedIntentTerms.length * 3;
      }

      const sharedKeywords = intersectNormalized(currentProfile.keywords, profile.keywords).slice(0, 3);
      if (sharedKeywords.length > 0) {
        reasons.add(`关键词重合：${sharedKeywords.join(' / ')}`);
        score += sharedKeywords.length;
      }

      const sharedTopics = intersectNormalized(currentTopics, projectTopics).slice(0, 2);
      if (sharedTopics.length > 0) {
        reasons.add(`Topic 交集：${sharedTopics.join(' / ')}`);
        score += sharedTopics.length;
      }

      const sharedTags = intersectNormalized(currentProfile.semanticTags, profile.semanticTags).slice(0, 2);
      if (sharedTags.length > 0) {
        sharedTags.forEach((tag) => {
          const cluster = clusterLookup.get(tag);
          reasons.add(`都和 ${cluster?.label || tag} 相关`);
        });
        score += sharedTags.length * 2;
      }

      const currentPrimary = resolveClusterId(currentProfile.primaryCluster);
      const projectPrimary = resolveClusterId(profile.primaryCluster);

      if (currentPrimary === projectPrimary) {
        const cluster = clusterLookup.get(projectPrimary);
        reasons.add(`同属 ${cluster?.label || projectPrimary}`);
        score += 3;
      }

      if (current.project_type && project.project_type && current.project_type === project.project_type) {
        reasons.add('项目形态接近');
        score += 1;
      }

      const hasStrongFunctionalMatch = sharedUseCases.length > 0
        || sharedCapabilities.length > 0
        || sharedProblemSignals.length > 0
        || sharedIntentTerms.length >= 2
        || (
          currentPrimary === projectPrimary
          && (sharedKeywords.length > 0 || sharedTopics.length > 0)
        );

      return {
        score,
        functionalScore,
        hasStrongFunctionalMatch,
        project: {
          ...toProjectListItem(project),
          reason: [...reasons].slice(0, 3),
          score,
        } satisfies RelatedProjectItem,
      };
    })
    .filter((item) => item.score > 0 && item.hasStrongFunctionalMatch && (item.functionalScore >= 6 || item.score >= 6))
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
