/**
 * 标准化标签词典
 * 用于提示词中，让 LLM 从标准词典中选择标签
 */

export const STANDARD_TAG_DICTIONARY = {
  // AI 与机器学习
  aiml: [
    'AI Agent',
    'LLM 应用',
    'RAG',
    '向量检索',
    '模型训练',
    '微调',
    '机器学习',
    '深度学习',
    '自然语言处理',
    '计算机视觉',
    '推荐系统',
  ],

  // 自动化
  automation: [
    '工作流自动化',
    '任务调度',
    '网页抓取',
    '浏览器自动化',
    'RPA',
    '数据采集',
    'E2E 测试',
  ],

  // 前端开发
  frontend: [
    'UI 组件库',
    '设计系统',
    '动画库',
    'React',
    'Vue',
    'Next.js',
    'Nuxt',
    'Svelte',
    '前端框架',
    '状态管理',
    '路由',
    '表单处理',
  ],

  // 后端开发
  backend: [
    'API 框架',
    'Web 框架',
    '数据库',
    'ORM',
    '认证授权',
    'GraphQL',
    'REST API',
    '微服务',
    '消息队列',
    '缓存',
  ],

  // DevOps
  devops: [
    'Docker',
    'Kubernetes',
    'CI/CD',
    '监控',
    '日志',
    '可观测性',
    '基础设施即代码',
    '云原生',
    '服务网格',
  ],

  // 开发工具
  devtools: [
    'CLI 工具',
    '代码生成',
    'Linter',
    'Formatter',
    'IDE 插件',
    '调试工具',
    '性能分析',
    '包管理',
  ],

  // 内容与文档
  content: [
    'CMS',
    '文档生成',
    '静态站点生成',
    'Markdown',
    '博客引擎',
    'Wiki',
    '知识库',
  ],

  // 数据处理
  data: [
    '数据处理',
    '数据可视化',
    'ETL',
    '数据分析',
    '数据清洗',
    '数据导出',
  ],

  // 安全
  security: [
    '安全扫描',
    '漏洞检测',
    '加密',
    '密钥管理',
    '访问控制',
    '审计日志',
  ],

  // 其他
  other: [
    '项目模板',
    'Boilerplate',
    '学习资源',
    '工具集合',
    '实用工具',
  ],
} as const;

/**
 * 使用场景标准词典
 */
export const STANDARD_USE_CASE_DICTIONARY = [
  // AI 相关
  '构建 AI Agent',
  '开发聊天机器人',
  '实现 RAG 系统',
  '训练机器学习模型',
  '微调大语言模型',
  '构建推荐系统',

  // 自动化
  '工作流自动化',
  '网页数据采集',
  '浏览器自动化测试',
  '定时任务调度',
  'RPA 流程自动化',

  // 开发
  'UI 界面开发',
  '前端应用搭建',
  'API 开发',
  '后端服务开发',
  '全栈应用开发',
  '移动应用开发',

  // 运维
  '应用部署',
  '容器化',
  'CI/CD 流水线',
  '系统监控',
  '日志分析',
  '性能优化',

  // 内容
  '内容管理',
  '文档站搭建',
  '博客搭建',
  '知识库管理',

  // 数据
  '数据处理',
  '数据可视化',
  '数据分析',

  // 其他
  '快速原型开发',
  '学习编程',
  '代码质量提升',
  '团队协作',
] as const;

/**
 * 能力关键词标准词典
 */
export const STANDARD_CAPABILITY_DICTIONARY = [
  // 核心能力
  '数据处理',
  '文件操作',
  '网络请求',
  '数据库操作',
  '缓存管理',
  '队列处理',
  '定时任务',
  '事件处理',

  // UI 能力
  '组件渲染',
  '状态管理',
  '路由导航',
  '表单验证',
  '动画效果',
  '响应式布局',
  '主题切换',
  '国际化',

  // API 能力
  '接口开发',
  '数据验证',
  '错误处理',
  '认证授权',
  '限流控制',
  '日志记录',
  '文档生成',

  // 数据能力
  '数据查询',
  '数据聚合',
  '数据导入',
  '数据导出',
  '数据同步',
  '数据转换',

  // 集成能力
  '第三方集成',
  'Webhook',
  'API 调用',
  '消息推送',
  '邮件发送',
  '文件上传',
  '支付集成',

  // 安全能力
  '加密解密',
  '权限控制',
  '审计日志',
  '安全扫描',
  '漏洞检测',

  // 运维能力
  '健康检查',
  '性能监控',
  '错误追踪',
  '日志收集',
  '指标统计',
  '告警通知',
] as const;

/**
 * 生成提示词中的标签选择指引
 */
export function generateTagSelectionGuide(): string {
  const categories = Object.entries(STANDARD_TAG_DICTIONARY);

  const lines = ['请从以下标准标签中选择最相关的标签（每个类别最多选2个）：\n'];

  for (const [category, tags] of categories) {
    const categoryName = {
      aiml: 'AI 与机器学习',
      automation: '自动化',
      frontend: '前端开发',
      backend: '后端开发',
      devops: 'DevOps',
      devtools: '开发工具',
      content: '内容与文档',
      data: '数据处理',
      security: '安全',
      other: '其他',
    }[category] || category;

    lines.push(`${categoryName}: ${tags.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * 生成使用场景选择指引
 */
export function generateUseCaseSelectionGuide(): string {
  return `请从以下标准使用场景中选择最相关的场景（最多选3个）：\n${STANDARD_USE_CASE_DICTIONARY.join(', ')}`;
}

/**
 * 生成能力关键词选择指引
 */
export function generateCapabilitySelectionGuide(): string {
  return `请从以下标准能力关键词中选择最相关的能力（最多选5个）：\n${STANDARD_CAPABILITY_DICTIONARY.join(', ')}`;
}
