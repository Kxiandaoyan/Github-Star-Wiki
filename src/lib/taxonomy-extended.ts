/**
 * 扩展的分类体系定义
 * 包含更细粒度的专题、使用场景和项目类型
 */

import type { SemanticClusterDefinition } from './semantic-profile';

/**
 * 扩展的语义聚类定义（从10个扩展到28个）
 */
export const EXTENDED_SEMANTIC_CLUSTERS: SemanticClusterDefinition[] = [
  // AI 与智能体相关
  {
    id: 'ai-agents',
    label: 'AI Agent',
    description: '智能体、多代理协作、MCP、自主执行与任务编排',
    color: '#0f62fe',
    keywords: ['ai agent', 'agent', 'agentic', 'assistant', 'copilot', 'multi-agent', 'mcp', 'tool calling', 'autonomous'],
    topicKeywords: ['agent', 'agents', 'assistant', 'multi-agent', 'agentic', 'mcp', 'copilot', 'ai-agent'],
  },
  {
    id: 'llm-applications',
    label: 'LLM 应用',
    description: '基于大语言模型的应用、聊天机器人、对话系统',
    color: '#8b5cf6',
    keywords: ['llm', 'chatbot', 'chat', 'gpt', 'claude', 'conversation', 'dialogue', 'language model'],
    topicKeywords: ['llm', 'chatbot', 'gpt', 'claude', 'openai', 'chat', 'language-model'],
  },
  {
    id: 'rag-retrieval',
    label: 'RAG 与检索',
    description: 'RAG、向量检索、知识库、文档问答',
    color: '#14b8a6',
    keywords: ['rag', 'retrieval', 'vector database', 'embedding', 'semantic search', 'knowledge base', 'document qa'],
    topicKeywords: ['rag', 'retrieval', 'vector', 'embedding', 'semantic-search', 'knowledge-base'],
  },
  {
    id: 'ml-training',
    label: '模型训练',
    description: '机器学习训练、微调、数据集处理',
    color: '#10b981',
    keywords: ['training', 'fine-tuning', 'dataset', 'machine learning', 'deep learning', 'model training', 'pytorch', 'tensorflow'],
    topicKeywords: ['training', 'fine-tuning', 'dataset', 'machine-learning', 'deep-learning', 'pytorch', 'tensorflow'],
  },

  // 自动化与工作流
  {
    id: 'automation',
    label: '自动化',
    description: '自动执行、工作流编排、任务调度',
    color: '#f97316',
    keywords: ['automation', 'automate', 'workflow', 'orchestration', 'scheduler', 'task automation'],
    topicKeywords: ['automation', 'workflow', 'orchestration', 'scheduler', 'workflow-automation'],
  },
  {
    id: 'web-scraping',
    label: '网页抓取',
    description: '爬虫、数据采集、网页自动化',
    color: '#f59e0b',
    keywords: ['scraper', 'crawler', 'scraping', 'web scraping', 'data extraction', 'spider'],
    topicKeywords: ['scraper', 'crawler', 'scraping', 'web-scraping', 'spider'],
  },
  {
    id: 'browser-automation',
    label: '浏览器自动化',
    description: 'Puppeteer、Playwright、Selenium 等浏览器自动化',
    color: '#ec4899',
    keywords: ['browser automation', 'puppeteer', 'playwright', 'selenium', 'headless browser', 'e2e testing'],
    topicKeywords: ['browser-automation', 'puppeteer', 'playwright', 'selenium', 'e2e'],
  },
  {
    id: 'rpa',
    label: 'RPA',
    description: '机器人流程自动化、桌面自动化',
    color: '#f43f5e',
    keywords: ['rpa', 'robotic process automation', 'desktop automation', 'ui automation'],
    topicKeywords: ['rpa', 'robotic-process-automation', 'desktop-automation'],
  },

  // 前端与 UI
  {
    id: 'ui-components',
    label: 'UI 组件库',
    description: 'React、Vue、Angular 组件库',
    color: '#8b5cf6',
    keywords: ['component library', 'ui component', 'react components', 'vue components', 'design system'],
    topicKeywords: ['ui', 'component', 'components', 'react', 'vue', 'design-system'],
    projectTypes: ['ui'],
  },
  {
    id: 'design-systems',
    label: '设计系统',
    description: '完整的设计系统、设计规范、UI Kit',
    color: '#a855f7',
    keywords: ['design system', 'design tokens', 'ui kit', 'style guide'],
    topicKeywords: ['design-system', 'design-tokens', 'ui-kit'],
  },
  {
    id: 'animation',
    label: '动画与交互',
    description: '动画库、交互效果、视觉特效',
    color: '#d946ef',
    keywords: ['animation', 'motion', 'transition', 'interactive', 'visual effects'],
    topicKeywords: ['animation', 'motion', 'transition', 'framer-motion'],
  },
  {
    id: 'frontend-frameworks',
    label: '前端框架',
    description: 'React、Vue、Next.js、Nuxt 等前端框架',
    color: '#06b6d4',
    keywords: ['react', 'vue', 'nextjs', 'nuxt', 'svelte', 'frontend framework'],
    topicKeywords: ['react', 'vue', 'nextjs', 'nuxt', 'svelte', 'frontend'],
  },

  // 开发工具
  {
    id: 'cli-tools',
    label: 'CLI 工具',
    description: '命令行工具、终端应用',
    color: '#84cc16',
    keywords: ['cli', 'command line', 'terminal', 'console'],
    topicKeywords: ['cli', 'command-line', 'terminal'],
    projectTypes: ['cli'],
  },
  {
    id: 'code-generation',
    label: '代码生成',
    description: '代码生成器、脚手架、模板引擎',
    color: '#22c55e',
    keywords: ['code generation', 'generator', 'scaffold', 'codegen', 'boilerplate generator'],
    topicKeywords: ['generator', 'codegen', 'code-generation', 'scaffold'],
  },
  {
    id: 'linting-formatting',
    label: '代码质量',
    description: 'Linter、Formatter、代码检查',
    color: '#65a30d',
    keywords: ['linter', 'formatter', 'eslint', 'prettier', 'code quality', 'static analysis'],
    topicKeywords: ['linter', 'formatter', 'eslint', 'prettier', 'lint'],
  },
  {
    id: 'ide-extensions',
    label: 'IDE 扩展',
    description: 'VSCode、JetBrains 等 IDE 插件',
    color: '#16a34a',
    keywords: ['vscode extension', 'ide plugin', 'editor extension'],
    topicKeywords: ['vscode', 'vscode-extension', 'ide', 'editor'],
    projectTypes: ['plugin'],
  },

  // 后端与基础设施
  {
    id: 'backend-frameworks',
    label: '后端框架',
    description: 'Express、FastAPI、Spring 等后端框架',
    color: '#0ea5e9',
    keywords: ['backend', 'server', 'api framework', 'web framework', 'express', 'fastapi'],
    topicKeywords: ['backend', 'server', 'api', 'express', 'fastapi', 'framework'],
  },
  {
    id: 'database-orm',
    label: '数据库与 ORM',
    description: '数据库、ORM、查询构建器',
    color: '#0284c7',
    keywords: ['database', 'orm', 'sql', 'query builder', 'prisma', 'typeorm'],
    topicKeywords: ['database', 'orm', 'sql', 'prisma', 'typeorm'],
  },
  {
    id: 'authentication',
    label: '认证授权',
    description: '身份认证、授权、SSO、OAuth',
    color: '#0369a1',
    keywords: ['authentication', 'auth', 'authorization', 'sso', 'oauth', 'jwt'],
    topicKeywords: ['auth', 'authentication', 'authorization', 'oauth', 'jwt'],
  },
  {
    id: 'api-development',
    label: 'API 开发',
    description: 'REST API、GraphQL、API 工具',
    color: '#075985',
    keywords: ['api', 'rest', 'graphql', 'api development', 'api tools'],
    topicKeywords: ['api', 'rest', 'graphql', 'api-development'],
  },

  // DevOps 与部署
  {
    id: 'containerization',
    label: '容器化',
    description: 'Docker、Kubernetes、容器编排',
    color: '#ef4444',
    keywords: ['docker', 'kubernetes', 'container', 'k8s', 'containerization'],
    topicKeywords: ['docker', 'kubernetes', 'container', 'k8s'],
  },
  {
    id: 'cicd',
    label: 'CI/CD',
    description: '持续集成、持续部署、自动化流水线',
    color: '#dc2626',
    keywords: ['ci/cd', 'continuous integration', 'continuous deployment', 'github actions', 'gitlab ci'],
    topicKeywords: ['ci', 'cd', 'cicd', 'github-actions', 'gitlab-ci'],
  },
  {
    id: 'monitoring',
    label: '监控与观测',
    description: '系统监控、日志、APM、可观测性',
    color: '#b91c1c',
    keywords: ['monitoring', 'observability', 'logging', 'apm', 'metrics', 'tracing'],
    topicKeywords: ['monitoring', 'observability', 'logging', 'metrics'],
  },
  {
    id: 'infrastructure',
    label: '基础设施',
    description: 'IaC、云平台、服务器管理',
    color: '#991b1b',
    keywords: ['infrastructure', 'iac', 'terraform', 'cloud', 'aws', 'azure'],
    topicKeywords: ['infrastructure', 'iac', 'terraform', 'cloud'],
  },

  // 内容与文档
  {
    id: 'cms',
    label: 'CMS',
    description: '内容管理系统、Headless CMS',
    color: '#64748b',
    keywords: ['cms', 'content management', 'headless cms', 'strapi', 'contentful'],
    topicKeywords: ['cms', 'content-management', 'headless-cms'],
  },
  {
    id: 'documentation',
    label: '文档工具',
    description: '文档生成、文档站、API 文档',
    color: '#475569',
    keywords: ['documentation', 'docs', 'doc generator', 'api docs'],
    topicKeywords: ['docs', 'documentation', 'doc-generator'],
    projectTypes: ['docs'],
  },
  {
    id: 'knowledge-base',
    label: '知识库',
    description: 'Wiki、知识管理、笔记系统',
    color: '#334155',
    keywords: ['wiki', 'knowledge base', 'note taking', 'knowledge management'],
    topicKeywords: ['wiki', 'knowledge-base', 'notes'],
  },

  // 其他
  {
    id: 'starter-templates',
    label: '启动模板',
    description: 'Starter、Boilerplate、项目模板',
    color: '#f59e0b',
    keywords: ['starter', 'template', 'boilerplate', 'starter kit'],
    topicKeywords: ['starter', 'template', 'boilerplate', 'starter-template'],
    projectTypes: ['template'],
  },
  {
    id: 'productivity-apps',
    label: '生产力应用',
    description: '可直接使用的生产力工具和应用',
    color: '#10b981',
    keywords: ['productivity', 'self-hosted', 'application', 'tool'],
    topicKeywords: ['productivity', 'self-hosted', 'app', 'application'],
    projectTypes: ['app'],
  },
];

/**
 * 扩展的使用场景定义（从4个扩展到18个）
 */
export interface UseCaseDefinition {
  slug: string;
  name: string;
  title: string;
  description: string;
  keywords: string[];
  topicKeywords: string[];
  projectTypes?: string[];
  relatedClusters?: string[];
}

export const EXTENDED_USE_CASES: UseCaseDefinition[] = [
  // AI 相关场景
  {
    slug: 'ai-agent-development',
    name: 'AI Agent 开发',
    title: '适合 AI Agent 开发的开源项目',
    description: '用于构建智能体、多代理系统、MCP 服务器和自主任务执行的工具和框架',
    keywords: ['ai agent', 'agent', 'mcp', 'autonomous', 'multi-agent'],
    topicKeywords: ['agent', 'agents', 'ai-agent', 'mcp', 'multi-agent'],
    relatedClusters: ['ai-agents'],
  },
  {
    slug: 'chatbot-building',
    name: '聊天机器人',
    title: '适合构建聊天机器人的开源项目',
    description: '用于开发对话系统、客服机器人、AI 助手的框架和工具',
    keywords: ['chatbot', 'chat', 'conversation', 'dialogue', 'assistant'],
    topicKeywords: ['chatbot', 'chat', 'conversation', 'assistant'],
    relatedClusters: ['llm-applications'],
  },
  {
    slug: 'rag-implementation',
    name: 'RAG 实现',
    title: '适合实现 RAG 的开源项目',
    description: '用于构建检索增强生成系统、知识库问答、文档智能的工具',
    keywords: ['rag', 'retrieval', 'vector', 'embedding', 'knowledge base'],
    topicKeywords: ['rag', 'retrieval', 'vector', 'embedding'],
    relatedClusters: ['rag-retrieval'],
  },
  {
    slug: 'model-training',
    name: '模型训练',
    title: '适合模型训练的开源项目',
    description: '用于机器学习训练、模型微调、数据集处理的工具和框架',
    keywords: ['training', 'fine-tuning', 'dataset', 'machine learning'],
    topicKeywords: ['training', 'fine-tuning', 'dataset', 'machine-learning'],
    relatedClusters: ['ml-training'],
  },

  // 自动化场景
  {
    slug: 'workflow-automation',
    name: '工作流自动化',
    title: '适合工作流自动化的开源项目',
    description: '用于任务编排、流程自动化、定时任务的工具',
    keywords: ['workflow', 'automation', 'orchestration', 'scheduler'],
    topicKeywords: ['workflow', 'automation', 'orchestration'],
    relatedClusters: ['automation'],
  },
  {
    slug: 'web-scraping',
    name: '网页数据采集',
    title: '适合网页数据采集的开源项目',
    description: '用于爬虫开发、数据抓取、网页解析的工具和框架',
    keywords: ['scraper', 'crawler', 'scraping', 'data extraction'],
    topicKeywords: ['scraper', 'crawler', 'scraping'],
    relatedClusters: ['web-scraping'],
  },
  {
    slug: 'browser-testing',
    name: '浏览器测试',
    title: '适合浏览器自动化测试的开源项目',
    description: '用于 E2E 测试、UI 测试、浏览器自动化的工具',
    keywords: ['browser automation', 'e2e testing', 'ui testing', 'puppeteer', 'playwright'],
    topicKeywords: ['browser-automation', 'e2e', 'testing', 'puppeteer', 'playwright'],
    relatedClusters: ['browser-automation'],
  },

  // 前端开发场景
  {
    slug: 'ui-development',
    name: 'UI 开发',
    title: '适合 UI 开发的开源项目',
    description: '用于构建用户界面、组件库、设计系统的工具和框架',
    keywords: ['ui', 'component', 'design system', 'frontend'],
    topicKeywords: ['ui', 'component', 'design-system', 'frontend'],
    projectTypes: ['ui'],
    relatedClusters: ['ui-components', 'design-systems'],
  },
  {
    slug: 'frontend-building',
    name: '前端应用搭建',
    title: '适合前端应用搭建的开源项目',
    description: '用于快速搭建前端应用、SPA、SSR 应用的框架和模板',
    keywords: ['react', 'vue', 'nextjs', 'frontend', 'spa', 'ssr'],
    topicKeywords: ['react', 'vue', 'nextjs', 'frontend'],
    relatedClusters: ['frontend-frameworks', 'starter-templates'],
  },
  {
    slug: 'animation-effects',
    name: '动画与特效',
    title: '适合实现动画特效的开源项目',
    description: '用于创建动画、过渡效果、交互体验的库和工具',
    keywords: ['animation', 'motion', 'transition', 'interactive'],
    topicKeywords: ['animation', 'motion', 'transition'],
    relatedClusters: ['animation'],
  },

  // 后端开发场景
  {
    slug: 'api-development',
    name: 'API 开发',
    title: '适合 API 开发的开源项目',
    description: '用于构建 REST API、GraphQL API、微服务的框架和工具',
    keywords: ['api', 'rest', 'graphql', 'backend', 'microservices'],
    topicKeywords: ['api', 'rest', 'graphql', 'backend'],
    relatedClusters: ['backend-frameworks', 'api-development'],
  },
  {
    slug: 'database-management',
    name: '数据库管理',
    title: '适合数据库管理的开源项目',
    description: '用于数据库操作、ORM、数据迁移的工具和库',
    keywords: ['database', 'orm', 'sql', 'migration'],
    topicKeywords: ['database', 'orm', 'sql'],
    relatedClusters: ['database-orm'],
  },
  {
    slug: 'authentication-setup',
    name: '认证授权',
    title: '适合实现认证授权的开源项目',
    description: '用于用户认证、权限管理、SSO 的解决方案',
    keywords: ['authentication', 'auth', 'authorization', 'sso', 'oauth'],
    topicKeywords: ['auth', 'authentication', 'authorization'],
    relatedClusters: ['authentication'],
  },

  // DevOps 场景
  {
    slug: 'deployment',
    name: '应用部署',
    title: '适合应用部署的开源项目',
    description: '用于应用部署、容器化、云原生的工具和平台',
    keywords: ['deployment', 'docker', 'kubernetes', 'cloud'],
    topicKeywords: ['deployment', 'docker', 'kubernetes'],
    relatedClusters: ['containerization', 'infrastructure'],
  },
  {
    slug: 'cicd-pipeline',
    name: 'CI/CD 流水线',
    title: '适合构建 CI/CD 流水线的开源项目',
    description: '用于持续集成、持续部署、自动化测试的工具',
    keywords: ['ci/cd', 'continuous integration', 'pipeline', 'github actions'],
    topicKeywords: ['ci', 'cd', 'cicd', 'github-actions'],
    relatedClusters: ['cicd'],
  },
  {
    slug: 'system-monitoring',
    name: '系统监控',
    title: '适合系统监控的开源项目',
    description: '用于监控、日志、告警、可观测性的工具和平台',
    keywords: ['monitoring', 'observability', 'logging', 'metrics'],
    topicKeywords: ['monitoring', 'observability', 'logging'],
    relatedClusters: ['monitoring'],
  },

  // 开发工具场景
  {
    slug: 'developer-productivity',
    name: '开发提效',
    title: '适合提升开发效率的开源项目',
    description: '用于提升开发效率、代码质量、团队协作的工具',
    keywords: ['developer tools', 'productivity', 'cli', 'code quality'],
    topicKeywords: ['developer-tools', 'productivity', 'cli'],
    relatedClusters: ['cli-tools', 'linting-formatting', 'code-generation'],
  },

  // 内容管理场景
  {
    slug: 'content-management',
    name: '内容管理',
    title: '适合内容管理的开源项目',
    description: '用于内容管理、博客搭建、文档站的 CMS 和工具',
    keywords: ['cms', 'content management', 'blog', 'documentation'],
    topicKeywords: ['cms', 'content-management', 'blog', 'docs'],
    relatedClusters: ['cms', 'documentation'],
  },
];

/**
 * 扩展的项目类型定义（从11个扩展到20个）
 */
export const EXTENDED_PROJECT_TYPES = {
  // 应用类
  app: '应用项目',
  'web-app': 'Web 应用',
  'desktop-app': '桌面应用',
  'mobile-app': '移动应用',

  // 库与框架
  library: '库 / SDK',
  framework: '框架',

  // 工具类
  cli: 'CLI 工具',
  tool: '开发工具',

  // 扩展类
  plugin: '插件',
  extension: '浏览器扩展',
  'vscode-extension': 'VSCode 扩展',

  // UI 相关
  ui: 'UI 组件库',
  'design-system': '设计系统',

  // 模板类
  template: '项目模板',
  boilerplate: 'Boilerplate',
  starter: 'Starter Kit',

  // 内容类
  docs: '文档项目',
  'awesome-list': '资源合集',
  content: '内容项目',

  // 配置类
  config: '配置项目',
} as const;

export type ExtendedProjectType = keyof typeof EXTENDED_PROJECT_TYPES;
