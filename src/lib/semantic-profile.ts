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
  {
    id: 'agent-workflows',
    label: 'Agent 工作流',
    description: '聚合智能体、多代理协作、MCP、提示编排与自主执行相关项目。',
    color: '#0f62fe',
    keywords: ['ai agent', 'agent', 'agentic', 'assistant', 'copilot', 'multi-agent', 'mcp', 'tool calling'],
    topicKeywords: ['agent', 'agents', 'assistant', 'multi-agent', 'agentic', 'mcp', 'copilot'],
  },
  {
    id: 'automation',
    label: '自动化',
    description: '聚合自动执行、浏览器自动化、工作流编排、抓取与任务调度相关项目。',
    color: '#f97316',
    keywords: ['automation', 'automate', 'workflow', 'orchestration', 'scraper', 'crawler', 'browser automation', 'rpa'],
    topicKeywords: ['automation', 'workflow', 'orchestration', 'scraper', 'crawler', 'browser-automation', 'rpa'],
  },
  {
    id: 'data-ai',
    label: 'AI 与数据',
    description: '聚合模型、RAG、向量检索、数据处理、训练与推理相关项目。',
    color: '#14b8a6',
    keywords: ['llm', 'rag', 'embedding', 'vector database', 'dataset', 'retrieval', 'inference', 'fine-tuning', 'machine learning'],
    topicKeywords: ['llm', 'rag', 'embedding', 'vector', 'retrieval', 'inference', 'dataset', 'machine-learning', 'deep-learning'],
  },
  {
    id: 'ui-experience',
    label: 'UI 与前端',
    description: '聚合界面组件、设计系统、前端体验和交互搭建相关项目。',
    color: '#8b5cf6',
    keywords: ['design system', 'component library', 'ui component', 'frontend', 'dashboard ui', 'animation'],
    topicKeywords: ['ui', 'component', 'components', 'design-system', 'frontend', 'animation', 'shadcn'],
    projectTypes: ['ui'],
  },
  {
    id: 'developer-tooling',
    label: '开发提效',
    description: '聚合 CLI、终端工具、开发辅助、代码生成与效率提升相关项目。',
    color: '#84cc16',
    keywords: ['developer tools', 'devtools', 'productivity', 'terminal', 'cli', 'generator', 'formatter', 'linter', 'context management'],
    topicKeywords: ['developer-tools', 'devtools', 'productivity', 'terminal', 'cli', 'generator', 'formatter', 'lint'],
    projectTypes: ['cli', 'plugin', 'config'],
  },
  {
    id: 'backend-platform',
    label: '后端与平台',
    description: '聚合 API、认证、数据库、服务端框架、CMS 与平台型项目。',
    color: '#0ea5e9',
    keywords: ['api', 'backend', 'server', 'auth', 'database', 'orm', 'cms', 'headless', 'sdk'],
    topicKeywords: ['api', 'backend', 'server', 'auth', 'database', 'orm', 'cms', 'headless'],
    projectTypes: ['library', 'app'],
  },
  {
    id: 'infra-devops',
    label: '部署与基础设施',
    description: '聚合部署、容器、云、观测、CI/CD 与基础设施治理相关项目。',
    color: '#ef4444',
    keywords: ['docker', 'kubernetes', 'deploy', 'deployment', 'devops', 'infra', 'cloud', 'monitoring', 'observability', 'ci/cd'],
    topicKeywords: ['docker', 'kubernetes', 'devops', 'infra', 'cloud', 'monitoring', 'observability', 'ci', 'cd'],
  },
  {
    id: 'starter-kits',
    label: '模板与启动器',
    description: '聚合 starter、boilerplate、脚手架与快速起步项目。',
    color: '#f59e0b',
    keywords: ['starter', 'template', 'boilerplate', 'scaffold', 'starter kit', 'starter template'],
    topicKeywords: ['starter', 'template', 'boilerplate', 'scaffold', 'starter-template'],
    projectTypes: ['template'],
  },
  {
    id: 'knowledge-content',
    label: '文档与内容',
    description: '聚合文档站、教程、知识库、awesome 列表与内容型项目。',
    color: '#64748b',
    keywords: ['documentation', 'docs', 'wiki', 'awesome list', 'knowledge base', 'tutorial', 'guide'],
    topicKeywords: ['docs', 'documentation', 'wiki', 'awesome', 'tutorial', 'guide', 'knowledge-base'],
    projectTypes: ['docs', 'awesome-list', 'content'],
  },
  {
    id: 'product-apps',
    label: '产品型应用',
    description: '聚合可直接使用或自行部署的应用、平台与产品化工具。',
    color: '#10b981',
    keywords: ['self-hosted', 'application', 'platform', 'dashboard', 'productivity app', 'tool'],
    topicKeywords: ['self-hosted', 'app', 'application', 'platform', 'dashboard'],
    projectTypes: ['app'],
  },
];

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
    case 'plugin':
    case 'config':
      return 'developer-tooling';
    case 'app':
      return 'product-apps';
    default:
      return fallbackClusterId;
  }
}

export function getSemanticClusterLookup() {
  return new Map(SEMANTIC_CLUSTER_DEFINITIONS.map((cluster) => [cluster.id, cluster]));
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
