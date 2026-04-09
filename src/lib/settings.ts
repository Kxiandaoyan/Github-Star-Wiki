import db from './db';

export type SettingCategory = 'github' | 'llm' | 'queue' | 'site' | 'storage' | 'prompts';
export type SettingInput = 'text' | 'password' | 'number' | 'textarea';

export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  category: SettingCategory;
  input: SettingInput;
  envKey?: string;
  defaultValue?: string;
  placeholder?: string;
}

export interface AdminSettingItem extends SettingDefinition {
  value: string;
  source: 'database' | 'environment' | 'default';
}

interface SettingRow {
  key: string;
  value: string;
}

const DEFAULT_CONTENT_SYSTEM_PROMPT = `你是一名严谨的技术内容编辑，擅长根据 GitHub 仓库事实信息生成中文项目介绍。
你必须遵守以下规则：
1. 只能依据提供的 README、目录结构、关键文件、分析结论和代码证据总结，不得虚构仓库中不存在的能力、命令、接口、架构或集成方式。
2. 输出内容必须清晰、具体，适合技术读者阅读。
3. 如果信息不足，请明确写出“从当前仓库信息可见”或“仓库中未明确给出”，不要脑补。
4. 安装方式和使用方式只允许写仓库里已经体现的步骤；如果没有明确命令，就说明未明确给出。
5. wikiDocuments 需要尽量覆盖项目定位、解决的问题、适用场景、安装方式、使用方式等主题。
6. mindMap 只在项目结构足够稳定时输出，节点使用短语，不要写长段落。`;

const DEFAULT_CONTENT_USER_PROMPT = `请基于下面的 GitHub 项目信息，输出一个 JSON 对象。
项目名称: {{projectName}}
原始描述: {{description}}

README 摘要:
{{readmeContent}}

仓库结构:
{{codeStructure}}

关键文件与依赖事实:
{{repositoryFacts}}

仓库分析摘要:
{{repositoryAnalysis}}

深读代码证据:
{{deepReadEvidence}}

严格返回 JSON，不要输出解释文字。格式如下：
{
  "oneLineIntro": "40-90 字中文一句话介绍",
  "chineseIntro": "220-420 字中文介绍，使用 \\n 分段",
  "wikiDocuments": [
    {
      "title": "章节标题",
      "content": "120-260 字中文正文"
    }
  ],
  "mindMap": {
    "label": "根节点",
    "children": [
      {
        "label": "一级节点",
        "children": [
          {
            "label": "二级节点"
          }
        ]
      }
    ]
  }
}

额外要求：
1. oneLineIntro 要突出定位、用途和价值。
2. chineseIntro 要覆盖项目用途、解决的问题、适用场景，以及仓库中能确认的技术特征。
3. wikiDocuments 生成 5 到 6 个章节，优先覆盖以下主题：
   - 项目定位与用途
   - 解决的问题
   - 适用场景
   - 安装方式
   - 使用方式
   - 补充说明或实现特点
4. 如果某些主题信息不足，也要保留该主题，但明确说明仓库中未明确给出。
5. 只有在 shouldGenerateMindMap 或代码证据足够明确时才输出思维导图；否则返回 null。`;

const DEFAULT_CONTENT_OUTPUT_FORMAT_PROMPT = `在同一个 JSON 中，还必须额外返回以下字段：
{
  "projectType": "app | library | cli | plugin | ui | template | docs | awesome-list | content | config | unknown",
  "seoTitle": "适合详情页 SEO 的中文标题，32-60 字",
  "seoDescription": "适合 meta description 的中文摘要，70-140 字",
  "faqItems": [
    {
      "question": "问题",
      "answer": "回答"
    }
  ]
}

补充要求：
1. faqItems 生成 3 到 5 条。
2. 如果仓库更偏文档、资源列表、模板或配置，请如实判断 projectType，不要误写成完整应用。
3. seoTitle 尽量覆盖“是什么 + 用途 + 安装/使用”。
4. seoDescription 要突出用途、适用场景和本页可看到的信息。
5. 如果你无法可靠判断某个字段，请保守输出，并明确基于仓库当前信息。`;

const DEFAULT_JSON_REPAIR_SYSTEM_PROMPT = '你是 JSON 修复助手。你只能输出合法 JSON，不要输出任何解释。';

const DEFAULT_JSON_REPAIR_USER_PROMPT = `请把下面的内容修复成合法 JSON，不改变原意，保留字段结构：

{{rawText}}`;

const DEFAULT_FALLBACK_SYSTEM_PROMPT = `你是一名技术内容整理助手。请输出最小但合法的 JSON，宁可保守，也不要虚构。`;

const DEFAULT_FALLBACK_USER_PROMPT = `请基于以下仓库事实生成保守版本 JSON。
项目名称: {{projectName}}
原始描述: {{description}}

README 摘要:
{{readmeContent}}

仓库结构:
{{codeStructure}}

关键文件与依赖事实:
{{repositoryFacts}}

仓库分析摘要:
{{repositoryAnalysis}}

深读代码证据:
{{deepReadEvidence}}

返回格式：
{
  "oneLineIntro": "中文一句话介绍",
  "chineseIntro": "中文简介",
  "wikiDocuments": [
    {
      "title": "章节标题",
      "content": "正文"
    }
  ],
  "mindMap": {
    "label": "项目名称",
    "children": []
  }
}

要求：
1. 生成 5 个章节。
2. 章节优先覆盖用途、问题、场景、安装、使用。
3. 如果没有明确安装或使用命令，就明确写仓库中未明确给出。
4. 如果不适合绘制思维导图，mindMap 返回 null。`;

const DEFAULT_SEO_SYSTEM_PROMPT = `你是一名技术 SEO 编辑，负责基于 GitHub 仓库事实和已生成的中文内容，产出适合搜索引擎和技术读者理解的标题、描述、FAQ 与项目类型判断。
要求：
1. 不能虚构仓库没有体现的能力。
2. 如果仓库更像文档、资源列表、模板、配置或展示项目，要明确识别出来。
3. FAQ 回答要简洁、可信、可被搜索引擎收录。
4. 只返回合法 JSON。`;

const DEFAULT_SEO_USER_PROMPT = `请根据下面信息生成 SEO 结构化 JSON。
项目名称: {{projectName}}
原始描述: {{description}}
一句话简介: {{oneLineIntro}}
中文介绍: {{chineseIntro}}

README 摘要:
{{readmeContent}}

仓库结构:
{{codeStructure}}

关键文件与依赖事实:
{{repositoryFacts}}

仓库分析摘要:
{{repositoryAnalysis}}

深读代码证据:
{{deepReadEvidence}}

Wiki 摘要:
{{wikiSummary}}

返回格式：
{
  "projectType": "app | library | cli | plugin | ui | template | docs | awesome-list | content | config | unknown",
  "seoTitle": "适合详情页 SEO 的中文标题，32-60 字",
  "seoDescription": "适合 meta description 的中文摘要，70-140 字",
  "faqItems": [
    {
      "question": "问题",
      "answer": "回答"
    }
  ]
}

补充要求：
1. FAQ 生成 3 到 5 条。
2. 如果仓库缺少明确代码结构，也要正常输出 projectType、seoTitle、seoDescription 与 FAQ。
3. 对文档型、资源型、awesome-list、模板类项目，要明确写出其用途，不要假装它是完整应用。
4. seoTitle 尽量覆盖“是什么 + 用途 + 安装/使用”。
5. seoDescription 要突出用途、适用场景和可在本页看到的信息。`;

const DEFAULT_REPO_ANALYSIS_SYSTEM_PROMPT = `你是一名仓库分析助手，负责用尽量少的 token 对 GitHub 项目建立结构化画像。
要求：
1. 只根据给定仓库证据分析，不得虚构功能。
2. 优先输出项目类型、适用场景、安装线索、使用线索、核心模块和下一步值得深读的文件。
3. 如果仓库偏文档、资源列表、模板或配置，请明确指出。
4. 只输出合法 JSON。`;

const DEFAULT_REPO_ANALYSIS_USER_PROMPT = `请分析下面的仓库扫描结果，并返回 JSON。
项目名称: {{projectName}}
原始描述: {{description}}

README 摘要:
{{readmeContent}}

仓库结构:
{{codeStructure}}

关键文件与依赖事实:
{{repositoryFacts}}

候选关键文件:
{{candidateFiles}}

返回格式：
{
  "projectType": "app | library | cli | plugin | ui | template | docs | awesome-list | content | config | unknown",
  "summary": "80-180 字中文摘要",
  "problemSolved": "它主要解决什么问题",
  "useCases": ["场景1", "场景2"],
  "installGuide": ["可确认的安装步骤或线索"],
  "usageGuide": ["可确认的使用步骤或线索"],
  "mainModules": ["模块1", "模块2"],
  "recommendedFiles": ["path/a", "path/b"],
  "shouldGenerateMindMap": true,
  "confidence": "low | medium | high"
}

要求：
1. recommendedFiles 最多返回 8 个，必须来自候选关键文件。
2. 如果项目不适合画思维导图，shouldGenerateMindMap 返回 false。
3. installGuide 和 usageGuide 只写能从证据中确认的内容。`;

const DEFAULT_DEEP_READ_SYSTEM_PROMPT = `你是一名代码深读助手，负责根据少量关键文件建立更可靠的项目理解。
要求：
1. 只根据输入文件内容总结。
2. 优先提炼架构、模块职责、安装证据、使用证据。
3. 用简短中文输出，避免重复原代码。
4. 只输出合法 JSON。`;

const DEFAULT_DEEP_READ_USER_PROMPT = `请根据下面的关键文件内容，返回结构化深读结果。
项目名称: {{projectName}}
原始描述: {{description}}

仓库分析摘要:
{{repositoryAnalysis}}

关键文件内容:
{{selectedFileContents}}

返回格式：
{
  "keyFileSummaries": [
    {
      "path": "文件路径",
      "summary": "该文件作用"
    }
  ],
  "architectureNotes": ["架构要点1", "架构要点2"],
  "installEvidence": ["安装证据1"],
  "usageEvidence": ["使用证据1"],
  "moduleMap": [
    {
      "name": "模块名",
      "purpose": "模块职责"
    }
  ],
  "reasoningSummary": "100-180 字中文总结"
}

要求：
1. keyFileSummaries 数量与输入文件一致或更少。
2. 只总结明确存在的模块和能力。
3. 如果没有安装或使用证据，就明确留空数组。`;

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: 'GITHUB_USERNAME',
    label: 'GitHub Username',
    description: 'GitHub 用户名。未提供 Token 时，用于读取公开 Star 列表。',
    category: 'github',
    input: 'text',
    envKey: 'GITHUB_USERNAME',
    placeholder: 'your_github_username',
  },
  {
    key: 'GITHUB_TOKEN',
    label: 'GitHub Token',
    description: 'GitHub 访问令牌。建议配置，用于提升 API 限额并读取当前登录用户的 Star 列表。',
    category: 'github',
    input: 'password',
    envKey: 'GITHUB_TOKEN',
    placeholder: 'ghp_xxx',
  },
  {
    key: 'GLM_API_KEYS',
    label: 'LLM API Keys',
    description: '一个或多个模型 API Key，使用英文逗号分隔。保存后会同步到 api_keys 表。',
    category: 'llm',
    input: 'textarea',
    envKey: 'GLM_API_KEYS',
    placeholder: 'key1,key2,key3',
  },
  {
    key: 'GLM_BASE_URL',
    label: 'LLM Base URL',
    description: '模型接口地址。',
    category: 'llm',
    input: 'text',
    envKey: 'GLM_BASE_URL',
    defaultValue: 'https://open.bigmodel.cn/api/anthropic',
  },
  {
    key: 'GLM_MODEL',
    label: 'LLM Model',
    description: '最终内容生成使用的主模型名称。',
    category: 'llm',
    input: 'text',
    envKey: 'GLM_MODEL',
    defaultValue: 'glm-4',
  },
  {
    key: 'GLM_ANALYSIS_MODEL',
    label: 'LLM Analysis Model',
    description: '仓库分析和深读使用的模型。留空时默认复用主模型。',
    category: 'llm',
    input: 'text',
    envKey: 'GLM_ANALYSIS_MODEL',
    defaultValue: '',
  },
  {
    key: 'SYNC_INTERVAL_MINUTES',
    label: 'Sync Interval Minutes',
    description: '定时同步 GitHub Star 列表的时间间隔，单位分钟。',
    category: 'queue',
    input: 'number',
    envKey: 'SYNC_INTERVAL_MINUTES',
    defaultValue: '60',
  },
  {
    key: 'TASK_CONCURRENCY',
    label: 'Task Concurrency',
    description: '后台并发处理任务数。',
    category: 'queue',
    input: 'number',
    envKey: 'TASK_CONCURRENCY',
    defaultValue: '2',
  },
  {
    key: 'MAX_RETRY_COUNT',
    label: 'Max Retry Count',
    description: '队列任务最大重试次数上限。',
    category: 'queue',
    input: 'number',
    envKey: 'MAX_RETRY_COUNT',
    defaultValue: '3',
  },
  {
    key: 'ANALYSIS_FILE_LIMIT',
    label: 'Analysis File Limit',
    description: '每个项目进入深读阶段前最多读取的关键文件数，用于控制 token。',
    category: 'queue',
    input: 'number',
    envKey: 'ANALYSIS_FILE_LIMIT',
    defaultValue: '8',
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    label: 'Site URL',
    description: '站点公开地址，用于 SEO 和详情页元数据。',
    category: 'site',
    input: 'text',
    envKey: 'NEXT_PUBLIC_SITE_URL',
    defaultValue: 'http://localhost:3000',
  },
  {
    key: 'REPO_CLONE_PATH',
    label: 'Repo Clone Path',
    description: '预留字段。当前版本未实际使用，但可在后台统一管理。',
    category: 'storage',
    input: 'text',
    envKey: 'REPO_CLONE_PATH',
    defaultValue: './data/repos',
  },
  {
    key: 'LOG_PATH',
    label: 'Log Path',
    description: '预留字段。当前版本未实际使用，但可在后台统一管理。',
    category: 'storage',
    input: 'text',
    envKey: 'LOG_PATH',
    defaultValue: './logs',
  },
  {
    key: 'PROMPT_CONTENT_SYSTEM',
    label: 'Content System Prompt',
    description: '主内容生成系统提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_CONTENT_SYSTEM_PROMPT,
  },
  {
    key: 'PROMPT_CONTENT_USER',
    label: 'Content User Prompt',
    description: '主内容生成用户提示词。支持 {{projectName}} 等占位符。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_CONTENT_USER_PROMPT,
  },
  {
    key: 'PROMPT_CONTENT_OUTPUT_FORMAT',
    label: 'Content Output Format Prompt',
    description: '补充输出格式约束，控制主内容生成时同时返回 SEO 字段与 FAQ。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_CONTENT_OUTPUT_FORMAT_PROMPT,
  },
  {
    key: 'PROMPT_JSON_REPAIR_SYSTEM',
    label: 'JSON Repair System Prompt',
    description: 'JSON 修复流程的系统提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_JSON_REPAIR_SYSTEM_PROMPT,
  },
  {
    key: 'PROMPT_JSON_REPAIR_USER',
    label: 'JSON Repair User Prompt',
    description: 'JSON 修复流程的用户提示词。支持 {{rawText}}。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_JSON_REPAIR_USER_PROMPT,
  },
  {
    key: 'PROMPT_FALLBACK_SYSTEM',
    label: 'Fallback System Prompt',
    description: '主流程失败后的保守生成系统提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_FALLBACK_SYSTEM_PROMPT,
  },
  {
    key: 'PROMPT_FALLBACK_USER',
    label: 'Fallback User Prompt',
    description: '主流程失败后的保守生成用户提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_FALLBACK_USER_PROMPT,
  },
  {
    key: 'PROMPT_SEO_SYSTEM',
    label: 'SEO System Prompt',
    description: 'SEO 标题、描述、FAQ 与项目类型生成使用的系统提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_SEO_SYSTEM_PROMPT,
  },
  {
    key: 'PROMPT_SEO_USER',
    label: 'SEO User Prompt',
    description: 'SEO 标题、描述、FAQ 与项目类型生成使用的用户提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_SEO_USER_PROMPT,
  },
  {
    key: 'PROMPT_REPO_ANALYSIS_SYSTEM',
    label: 'Repo Analysis System Prompt',
    description: '仓库分析阶段使用的系统提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_REPO_ANALYSIS_SYSTEM_PROMPT,
  },
  {
    key: 'PROMPT_REPO_ANALYSIS_USER',
    label: 'Repo Analysis User Prompt',
    description: '仓库分析阶段使用的用户提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_REPO_ANALYSIS_USER_PROMPT,
  },
  {
    key: 'PROMPT_DEEP_READ_SYSTEM',
    label: 'Deep Read System Prompt',
    description: '关键文件深读阶段使用的系统提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_DEEP_READ_SYSTEM_PROMPT,
  },
  {
    key: 'PROMPT_DEEP_READ_USER',
    label: 'Deep Read User Prompt',
    description: '关键文件深读阶段使用的用户提示词。',
    category: 'prompts',
    input: 'textarea',
    defaultValue: DEFAULT_DEEP_READ_USER_PROMPT,
  },
];

const DEFINITIONS_BY_KEY = new Map(SETTING_DEFINITIONS.map((item) => [item.key, item]));

export function seedAppSettings() {
  const insert = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);

  const transaction = db.transaction(() => {
    for (const definition of SETTING_DEFINITIONS) {
      const envValue = definition.envKey ? process.env[definition.envKey] : undefined;
      const initialValue = envValue ?? definition.defaultValue;

      if (initialValue !== undefined) {
        insert.run(definition.key, initialValue);
      }
    }
  });

  transaction();
}

function getStoredSetting(key: string) {
  return db.prepare('SELECT key, value FROM app_settings WHERE key = ?').get(key) as SettingRow | undefined;
}

export function getSettingValue(key: string) {
  const definition = DEFINITIONS_BY_KEY.get(key);
  const stored = getStoredSetting(key);

  if (stored) {
    return stored.value;
  }

  if (definition?.envKey && process.env[definition.envKey] !== undefined) {
    return process.env[definition.envKey] || '';
  }

  return definition?.defaultValue || '';
}

export function getNumberSetting(key: string, fallback: number) {
  const raw = getSettingValue(key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function saveSettings(updates: Record<string, string>) {
  const upsert = db.prepare(`
    INSERT INTO app_settings (key, value, created_at, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction((entries: Array<[string, string]>) => {
    for (const [key, value] of entries) {
      if (!DEFINITIONS_BY_KEY.has(key)) {
        continue;
      }

      upsert.run(key, value);
    }
  });

  transaction(Object.entries(updates));
}

export function getAdminSettings(): AdminSettingItem[] {
  return SETTING_DEFINITIONS.map((definition) => {
    const stored = getStoredSetting(definition.key);
    const envValue = definition.envKey ? process.env[definition.envKey] : undefined;

    return {
      ...definition,
      value: stored?.value ?? envValue ?? definition.defaultValue ?? '',
      source: stored ? 'database' : envValue !== undefined ? 'environment' : 'default',
    };
  });
}

export function getSettingsByCategory() {
  return getAdminSettings().reduce<Record<SettingCategory, AdminSettingItem[]>>(
    (accumulator, setting) => {
      accumulator[setting.category].push(setting);
      return accumulator;
    },
    {
      github: [],
      llm: [],
      queue: [],
      site: [],
      storage: [],
      prompts: [],
    }
  );
}

export function renderPromptTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');
}
