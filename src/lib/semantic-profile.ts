import type {
  RepositoryAnalysisResult,
  RepositoryDeepReadResult,
} from './project-analysis';

export interface SemanticClusterDefinition {
  id: string;
  label: string;
  description: string;
  color: string;
  keywords: string[];
  topicKeywords: string[];
  projectTypes?: string[];
}

export interface ProjectSemanticProfile {
  primaryCluster: string;
  semanticTags: string[];
  useCases: string[];
  capabilities: string[];
  keywords: string[];
  summary: string;
  problemSolved: string;
  confidence: 'low' | 'medium' | 'high';
}

interface SemanticDeriveInput {
  projectName: string;
  description?: string | null;
  projectType?: string | null;
  topics?: string[];
  oneLineIntro?: string | null;
  chineseIntro?: string | null;
  analysis?: RepositoryAnalysisResult | null;
  deepRead?: RepositoryDeepReadResult | null;
}

export const SEMANTIC_CLUSTER_DEFINITIONS: SemanticClusterDefinition[] = [
  // AI · Agent · LLM 分支（拆细 4 个）
  {
    id: 'ai-agents',
    label: 'AI Agent',
    description: '智能体、Claude Code / Codex / Cursor、MCP、多代理协作与自主任务执行。',
    color: '#0f62fe',
    keywords: ['ai agent', 'agent', 'agentic', 'assistant', 'copilot', 'multi-agent', 'mcp', 'tool calling', 'claude code', 'codex', 'cursor'],
    topicKeywords: ['agent', 'agents', 'ai-agent', 'ai-agents', 'assistant', 'multi-agent', 'agentic', 'mcp', 'mcp-server', 'claude-code', 'codex', 'copilot'],
  },
  {
    id: 'llm-apps',
    label: 'LLM 应用',
    description: '基于大模型的对话应用、聊天机器人、OpenAI/Claude/Gemini/DeepSeek 等接入工具。',
    color: '#8b5cf6',
    keywords: ['llm', 'chatbot', 'chat', 'gpt', 'claude', 'gemini', 'deepseek', 'openai', 'anthropic', 'conversation', 'language model'],
    topicKeywords: ['llm', 'chatbot', 'gpt', 'claude', 'openai', 'anthropic', 'gemini', 'deepseek', 'chat', 'language-model'],
  },
  {
    id: 'rag-retrieval',
    label: 'RAG 与检索',
    description: 'RAG、向量检索、语义搜索、知识库问答与上下文管理。',
    color: '#14b8a6',
    keywords: ['rag', 'retrieval', 'vector database', 'vector search', 'embedding', 'semantic search', 'knowledge base', 'context management'],
    topicKeywords: ['rag', 'retrieval', 'vector', 'vector-search', 'embedding', 'semantic-search', 'knowledge-base', 'context'],
  },
  {
    id: 'ml-training',
    label: '模型训练与推理',
    description: '机器学习训练、微调、数据集处理、推理加速、时间序列与多模态模型。',
    color: '#10b981',
    keywords: ['training', 'fine-tuning', 'dataset', 'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'inference', 'model serving', 'timeseries'],
    topicKeywords: ['training', 'fine-tuning', 'dataset', 'machine-learning', 'deep-learning', 'pytorch', 'tensorflow', 'inference', 'timeseries'],
  },

  // 自动化分支（拆细 3 个）
  {
    id: 'automation',
    label: '工作流自动化',
    description: '工作流编排、任务调度、RPA、可视化自动化与低代码流程。',
    color: '#f97316',
    keywords: ['automation', 'workflow', 'orchestration', 'rpa', 'task automation', 'workflow engine', 'n8n', 'zapier'],
    topicKeywords: ['automation', 'workflow', 'orchestration', 'workflow-automation', 'rpa', 'agentic-workflow'],
  },
  {
    id: 'browser-automation',
    label: '浏览器与抓取',
    description: 'Puppeteer、Playwright、爬虫、抓取、E2E 测试等浏览器 / 网页自动化。',
    color: '#ec4899',
    keywords: ['browser automation', 'puppeteer', 'playwright', 'selenium', 'scraper', 'crawler', 'scraping', 'headless browser', 'e2e testing'],
    topicKeywords: ['browser-automation', 'puppeteer', 'playwright', 'selenium', 'scraper', 'crawler', 'scraping', 'e2e'],
  },

  // 前端 · UI 分支（拆细 2 个）
  {
    id: 'ui-experience',
    label: 'UI 与设计系统',
    description: '组件库、设计系统、shadcn、动画与前端交互体验。',
    color: '#a855f7',
    keywords: ['design system', 'component library', 'ui component', 'shadcn', 'tailwind', 'radix', 'animation', 'motion'],
    topicKeywords: ['ui', 'components', 'component', 'design-system', 'shadcn', 'tailwind', 'radix-ui', 'animation', 'motion'],
    projectTypes: ['ui'],
  },
  {
    id: 'frontend-frameworks',
    label: '前端框架与应用',
    description: 'React、Vue、Next.js、Nuxt、Svelte 等前端框架与全栈模板。',
    color: '#06b6d4',
    keywords: ['react', 'vue', 'nextjs', 'next.js', 'nuxt', 'svelte', 'frontend', 'spa', 'ssr'],
    topicKeywords: ['react', 'vue', 'nextjs', 'next-js', 'nuxt', 'svelte', 'frontend'],
  },

  // 开发工具分支（拆细 3 个）
  {
    id: 'cli-terminal',
    label: 'CLI 与终端',
    description: '命令行工具、终端 UI、TUI、交互式 REPL 与 shell 增强。',
    color: '#84cc16',
    keywords: ['cli', 'command line', 'terminal', 'tui', 'shell', 'repl', 'console'],
    topicKeywords: ['cli', 'command-line', 'terminal', 'tui', 'shell'],
    projectTypes: ['cli'],
  },
  {
    id: 'developer-tooling',
    label: '开发提效',
    description: 'Linter、Formatter、代码生成、脚手架、VSCode 扩展等提升开发效率的工具。',
    color: '#22c55e',
    keywords: ['developer tools', 'devtools', 'productivity', 'linter', 'formatter', 'eslint', 'prettier', 'generator', 'scaffold', 'vscode extension', 'ide plugin'],
    topicKeywords: ['developer-tools', 'devtools', 'productivity', 'linter', 'formatter', 'lint', 'generator', 'vscode', 'vscode-extension', 'editor'],
    projectTypes: ['plugin', 'config'],
  },
  {
    id: 'code-intelligence',
    label: '代码智能',
    description: 'AI 代码补全、代码审查、代码重构、AST 解析与代码理解工具。',
    color: '#65a30d',
    keywords: ['code generation', 'code review', 'refactor', 'ast', 'code analysis', 'code intelligence', 'static analysis'],
    topicKeywords: ['codegen', 'code-generation', 'code-review', 'refactor', 'ast', 'static-analysis'],
  },

  // 后端分支（拆细 3 个）
  {
    id: 'backend-api',
    label: '后端与 API',
    description: 'Express、FastAPI、Nest、Spring 等后端框架与 REST / GraphQL API 工具。',
    color: '#0ea5e9',
    keywords: ['backend', 'server', 'api', 'rest', 'graphql', 'express', 'fastapi', 'nestjs', 'microservices'],
    topicKeywords: ['backend', 'server', 'api', 'rest', 'graphql', 'express', 'fastapi', 'nestjs', 'nodejs'],
    projectTypes: ['library'],
  },
  {
    id: 'database-storage',
    label: '数据库与存储',
    description: '数据库、ORM、查询构建器、向量库、缓存与存储引擎。',
    color: '#0284c7',
    keywords: ['database', 'orm', 'sql', 'postgres', 'mysql', 'redis', 'sqlite', 'mongodb', 'prisma', 'typeorm', 'query builder'],
    topicKeywords: ['database', 'orm', 'sql', 'postgres', 'mysql', 'redis', 'sqlite', 'mongodb', 'prisma'],
  },
  {
    id: 'auth-security',
    label: '认证与安全',
    description: '身份认证、授权、OAuth、JWT、SSO、渗透测试、加密与安全审计工具。',
    color: '#e11d48',
    keywords: ['authentication', 'auth', 'authorization', 'sso', 'oauth', 'jwt', 'security', 'pentest', 'rootkit', 'encryption', 'reverse shell'],
    topicKeywords: ['auth', 'authentication', 'authorization', 'oauth', 'jwt', 'security', 'pentest', 'red-team', 'reverse-shell'],
  },

  // DevOps 分支（拆细 2 个）
  {
    id: 'devops-infra',
    label: 'DevOps 与基础设施',
    description: 'Docker、Kubernetes、Terraform、CI/CD、云原生与自托管基础设施。',
    color: '#ef4444',
    keywords: ['docker', 'kubernetes', 'k8s', 'devops', 'terraform', 'infrastructure', 'cloud', 'ci/cd', 'github actions', 'iac'],
    topicKeywords: ['docker', 'kubernetes', 'k8s', 'devops', 'terraform', 'infrastructure', 'iac', 'cicd', 'ci-cd', 'github-actions'],
  },
  {
    id: 'observability',
    label: '监控与可观测',
    description: '日志、指标、追踪、APM、告警与可观测性平台。',
    color: '#b91c1c',
    keywords: ['monitoring', 'observability', 'logging', 'apm', 'metrics', 'tracing', 'alerting', 'prometheus', 'grafana'],
    topicKeywords: ['monitoring', 'observability', 'logging', 'metrics', 'tracing', 'prometheus', 'grafana'],
  },

  // 内容 / 模板 / 应用分支
  {
    id: 'starter-kits',
    label: '模板与启动器',
    description: 'Starter、Boilerplate、脚手架与全栈项目模板。',
    color: '#f59e0b',
    keywords: ['starter', 'template', 'boilerplate', 'scaffold', 'starter kit', 'starter template'],
    topicKeywords: ['starter', 'template', 'boilerplate', 'scaffold', 'starter-template', 'starter-kit'],
    projectTypes: ['template'],
  },
  {
    id: 'knowledge-content',
    label: '文档与知识库',
    description: '文档站、教程、awesome 合集、Wiki、笔记系统与内容型项目。',
    color: '#64748b',
    keywords: ['documentation', 'docs', 'wiki', 'awesome list', 'knowledge base', 'tutorial', 'note taking'],
    topicKeywords: ['docs', 'documentation', 'wiki', 'awesome', 'awesome-list', 'tutorial', 'knowledge-base', 'notes'],
    projectTypes: ['docs', 'awesome-list', 'content'],
  },
  {
    id: 'product-apps',
    label: '自托管应用',
    description: '可直接运行、自部署的产品型应用、平台与 dashboard。',
    color: '#059669',
    keywords: ['self-hosted', 'application', 'platform', 'dashboard', 'saas', 'web-app'],
    topicKeywords: ['self-hosted', 'selfhosted', 'app', 'application', 'platform', 'dashboard', 'saas'],
    projectTypes: ['app'],
  },
  {
    id: 'data-viz',
    label: '数据可视化',
    description: '图表、数据可视化、大屏、商业智能与可视化分析工具。',
    color: '#d946ef',
    keywords: ['visualization', 'chart', 'd3', 'dashboard', 'business intelligence', 'bi', 'data viz'],
    topicKeywords: ['visualization', 'chart', 'charts', 'd3', 'data-visualization', 'bi'],
  },
];

// 兼容旧数据：旧 primaryCluster ID → 新聚类 ID
export const CLUSTER_ALIAS_MAP: Record<string, string> = {
  'agent-workflows': 'ai-agents',
  'data-ai': 'ml-training',
  'backend-platform': 'backend-api',
  'infra-devops': 'devops-infra',
};

const fallbackClusterId = 'developer-tooling';

const genericTerms = new Set([
  'github',
  'open-source',
  'opensource',
  'project',
  'library',
  'application',
  'tool',
  'tools',
  'code',
  'framework',
  'solution',
  '开发',
  '项目',
  '工具',
  '开源',
  '仓库',
  '框架',
  '应用',
  '当前仓库信息不足',
  '暂时无法准确提炼其核心问题',
  '当前仓库信息不足 暂时无法准确提炼其核心问题',
]);

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function dedupe(values: string[], limit: number) {
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

function sanitizePhrase(value: string) {
  return value
    .replace(/[`*_#>[\]{}()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTextPhrases(value: string | null | undefined, limit: number) {
  return dedupe(
    sanitizePhrase(value || '')
      .split(/[，。；;,.!?\n|/]+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2 && part.length <= 28)
      .filter((part) => !genericTerms.has(normalizeText(part))),
    limit
  );
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function countTopicMatches(topics: string[], keywords: string[]) {
  return topics.reduce((count, topic) => count + (keywords.some((keyword) => topic.includes(keyword)) ? 1 : 0), 0);
}

function inferFallbackCluster(projectType: string | null | undefined) {
  switch (projectType) {
    case 'ui':
      return 'ui-experience';
    case 'template':
      return 'starter-kits';
    case 'docs':
    case 'awesome-list':
    case 'content':
      return 'knowledge-content';
    case 'cli':
      return 'cli-terminal';
    case 'plugin':
    case 'config':
      return 'developer-tooling';
    case 'app':
      return 'product-apps';
    default:
      return fallbackClusterId;
  }
}

export function resolveClusterId(id: string | null | undefined): string {
  if (!id) return fallbackClusterId;
  if (CLUSTER_ALIAS_MAP[id]) return CLUSTER_ALIAS_MAP[id];
  return id;
}

export function getSemanticClusterLookup() {
  const base = new Map(SEMANTIC_CLUSTER_DEFINITIONS.map((cluster) => [cluster.id, cluster]));

  // 让旧 ID 也能查到（指向新 cluster）
  for (const [oldId, newId] of Object.entries(CLUSTER_ALIAS_MAP)) {
    const target = base.get(newId);
    if (target && !base.has(oldId)) {
      base.set(oldId, target);
    }
  }

  return base;
}

export function deriveProjectSemanticProfile(input: SemanticDeriveInput): ProjectSemanticProfile {
  const topics = dedupe((input.topics || []).map((topic) => sanitizePhrase(topic)), 10);
  const useCases = dedupe(input.analysis?.useCases || [], 6);
  const capabilities = dedupe([
    ...(input.analysis?.mainModules || []),
    ...((input.deepRead?.moduleMap || []).map((item) => item.name)),
    ...((input.deepRead?.moduleMap || []).map((item) => item.purpose)),
  ], 8);

  const summary = input.analysis?.summary
    || input.oneLineIntro
    || input.description
    || `${input.projectName} 是一个开源项目。`;
  const problemSolved = input.analysis?.problemSolved
    || extractTextPhrases(input.chineseIntro || input.description, 1)[0]
    || '当前仓库信息不足，暂时无法准确提炼其核心问题。';

  const keywords = dedupe([
    ...topics,
    ...useCases,
    ...capabilities,
    ...extractTextPhrases(input.oneLineIntro, 3),
    ...extractTextPhrases(input.chineseIntro, 4),
    ...extractTextPhrases(problemSolved, 2),
  ], 14);

  const scoringText = [
    input.projectName,
    input.description,
    input.oneLineIntro,
    input.chineseIntro,
    summary,
    problemSolved,
    input.projectType,
    topics.join(' '),
    useCases.join(' '),
    capabilities.join(' '),
    keywords.join(' '),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  const scoredClusters = SEMANTIC_CLUSTER_DEFINITIONS
    .map((cluster) => {
      const topicMatches = countTopicMatches(topics.map((topic) => normalizeText(topic)), cluster.topicKeywords);
      const keywordMatches = countKeywordMatches(scoringText, cluster.keywords);
      const projectTypeMatch = cluster.projectTypes?.includes(input.projectType || '') ? 1 : 0;

      return {
        id: cluster.id,
        score: topicMatches * 3 + keywordMatches * 2 + projectTypeMatch * 2,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const primaryCluster = scoredClusters[0]?.id || inferFallbackCluster(input.projectType);
  const semanticTags = scoredClusters.length > 0
    ? dedupe(scoredClusters.slice(0, 3).map((item) => item.id), 3)
    : [primaryCluster];

  return {
    primaryCluster,
    semanticTags,
    useCases,
    capabilities,
    keywords,
    summary,
    problemSolved,
    confidence: input.analysis?.confidence || 'medium',
  };
}
