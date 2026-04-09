import axios from 'axios';
import OpenAI from 'openai';
import type {
  RepositoryAnalysisResult,
  RepositoryDeepReadResult,
  RepositoryScanResult,
} from './project-analysis';
import { maskApiKey } from './model-runtime';
import {
  getPromptValueFromSnapshot,
  PipelinePromptSnapshot,
  renderPromptTemplate,
} from './settings';
import {
  buildFallbackSeoDescription,
  buildFallbackSeoTitle,
  getSeoDescriptionQualityIssue,
  getSeoTitleQualityIssue,
  inferProjectTypeFromContent,
} from './seo-utils';

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiFormat?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GeneratedWikiDocument {
  title: string;
  content: string;
}

export interface GeneratedContentResult {
  oneLineIntro: string;
  chineseIntro: string;
  wikiDocuments: GeneratedWikiDocument[];
  mindMap: MindMapNode | null;
}

export interface GeneratedSeoResult {
  projectType: string;
  seoTitle: string;
  seoDescription: string;
  faqItems: FaqItem[];
}

export interface GeneratedProjectResult extends GeneratedContentResult, GeneratedSeoResult {}

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

type LLMApiFormat = 'anthropic' | 'openai';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | string
      | undefined;

    const message = typeof data === 'string'
      ? data
      : data?.error?.message || data?.message;

    if (status && message) {
      return `${fallback}: HTTP ${status} ${message}`;
    }

    if (status) {
      return `${fallback}: HTTP ${status}`;
    }

    if (error.message) {
      return `${fallback}: ${error.message}`;
    }
  }

  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}

function normalizeApiFormat(value: string | undefined, baseUrl: string): LLMApiFormat {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'anthropic') {
    return 'anthropic';
  }

  if (normalizedValue === 'openai') {
    return 'openai';
  }

  return baseUrl.includes('/anthropic') ? 'anthropic' : 'openai';
}

function extractOpenAIMessageContent(content: unknown) {
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        const candidate = part as { type?: unknown; text?: unknown };
        return candidate.type === 'text' && typeof candidate.text === 'string'
          ? candidate.text
          : '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

function extractOpenAIReasoningContent(reasoning: unknown) {
  if (typeof reasoning === 'string' && reasoning.trim()) {
    return reasoning.trim();
  }

  return extractOpenAIMessageContent(reasoning);
}

function extractOpenAIChoicePayload(choice: unknown) {
  const parsedChoice = (choice && typeof choice === 'object' ? choice : {}) as {
    finish_reason?: unknown;
    message?: unknown;
  };
  const parsedMessage = (parsedChoice.message && typeof parsedChoice.message === 'object'
    ? parsedChoice.message
    : {}) as {
    content?: unknown;
    reasoning?: unknown;
    reasoning_content?: unknown;
  };

  const content = extractOpenAIMessageContent(parsedMessage.content);
  const reasoning = [parsedMessage.reasoning, parsedMessage.reasoning_content]
    .map((value) => extractOpenAIReasoningContent(value))
    .filter(Boolean)
    .join('\n')
    .trim();

  return {
    content,
    reasoning,
    finishReason: typeof parsedChoice.finish_reason === 'string' ? parsedChoice.finish_reason : null,
  };
}

function parseJsonFromText(text: string) {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();

  const extractedObjects: string[] = [];
  const firstBraceIndex = cleaned.indexOf('{');

  if (firstBraceIndex >= 0) {
    let depth = 0;
    let start = -1;

    for (let index = firstBraceIndex; index < cleaned.length; index += 1) {
      const char = cleaned[index];

      if (char === '{') {
        if (depth === 0) {
          start = index;
        }
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          extractedObjects.push(cleaned.slice(start, index + 1));
          break;
        }
      }
    }
  }

  const candidates = [
    cleaned,
    cleaned.match(/\{[\s\S]*\}/)?.[0] || '',
    ...extractedObjects,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalizedCandidate = candidate
      .replace(/,\s*([}\]])/g, '$1')
      .trim();

    try {
      return JSON.parse(normalizedCandidate);
    } catch {
      continue;
    }
  }

  throw new Error('Unable to parse JSON content from LLM response.');
}

function tryParseJsonFromText(text: string) {
  try {
    return parseJsonFromText(text);
  } catch {
    return null;
  }
}

function normalizeTextField(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function sanitizeMindMapNode(input: unknown, fallbackLabel: string, depth = 0): MindMapNode | null {
  if (!input || typeof input !== 'object' || depth > 2) {
    return null;
  }

  const rawNode = input as { label?: unknown; children?: unknown };
  const label = normalizeTextField(rawNode.label, fallbackLabel);
  const rawChildren = Array.isArray(rawNode.children) ? rawNode.children : [];
  const children = rawChildren
    .slice(0, 8)
    .map((child, index) => sanitizeMindMapNode(child, `${label}-${index + 1}`, depth + 1))
    .filter(Boolean) as MindMapNode[];

  return children.length > 0 ? { label, children } : { label };
}

function normalizeWikiDocuments(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as GeneratedWikiDocument[];
  }

  return value
    .map((item) => {
      const document = item as { title?: unknown; content?: unknown };
      return {
        title: normalizeTextField(document.title, ''),
        content: normalizeTextField(document.content, ''),
      };
    })
    .filter((item) => item.title && item.content)
    .slice(0, 6);
}

function normalizeFaqItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as FaqItem[];
  }

  return value
    .map((item) => {
      const faq = item as { question?: unknown; answer?: unknown };
      return {
        question: normalizeTextField(faq.question, ''),
        answer: normalizeTextField(faq.answer, ''),
      };
    })
    .filter((item) => item.question && item.answer)
    .slice(0, 5);
}

function normalizeStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => normalizeTextField(item, ''))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeRepositoryAnalysis(value: unknown, projectName: string): RepositoryAnalysisResult {
  const parsed = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const recommendedFiles = normalizeStringArray(parsed.recommendedFiles, 8);
  const confidence = normalizeTextField(parsed.confidence, 'medium').toLowerCase();

  return {
    projectType: normalizeTextField(parsed.projectType, 'unknown'),
    summary: normalizeTextField(parsed.summary, `${projectName} 是一个开源项目。`),
    problemSolved: normalizeTextField(parsed.problemSolved, '仓库中未明确给出完整的问题定义。'),
    useCases: normalizeStringArray(parsed.useCases, 6),
    installGuide: normalizeStringArray(parsed.installGuide, 6),
    usageGuide: normalizeStringArray(parsed.usageGuide, 6),
    mainModules: normalizeStringArray(parsed.mainModules, 8),
    recommendedFiles,
    shouldGenerateMindMap: Boolean(parsed.shouldGenerateMindMap),
    confidence: confidence === 'low' || confidence === 'high' ? confidence : 'medium',
  };
}

function normalizeKeyFileSummaries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ path: string; summary: string }>;
  }

  return value
    .map((item) => {
      const parsed = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        path: normalizeTextField(parsed.path, ''),
        summary: normalizeTextField(parsed.summary, ''),
      };
    })
    .filter((item) => item.path && item.summary)
    .slice(0, 10);
}

function normalizeModuleMap(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ name: string; purpose: string }>;
  }

  return value
    .map((item) => {
      const parsed = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        name: normalizeTextField(parsed.name, ''),
        purpose: normalizeTextField(parsed.purpose, ''),
      };
    })
    .filter((item) => item.name && item.purpose)
    .slice(0, 10);
}

function normalizeRepositoryDeepRead(value: unknown): RepositoryDeepReadResult {
  const parsed = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;

  return {
    keyFileSummaries: normalizeKeyFileSummaries(parsed.keyFileSummaries),
    architectureNotes: normalizeStringArray(parsed.architectureNotes, 8),
    installEvidence: normalizeStringArray(parsed.installEvidence, 8),
    usageEvidence: normalizeStringArray(parsed.usageEvidence, 8),
    moduleMap: normalizeModuleMap(parsed.moduleMap),
    reasoningSummary: normalizeTextField(parsed.reasoningSummary, '仓库关键文件已读取，但暂未提炼出更稳定的结构化结论。'),
  };
}

function summarizeWikiForPrompt(wikiDocuments: GeneratedWikiDocument[]) {
  return wikiDocuments
    .map((item, index) => `${index + 1}. ${item.title}\n${item.content.slice(0, 180)}`)
    .join('\n\n')
    .slice(0, 4000);
}

function buildFallbackFaqItems(
  projectName: string,
  oneLineIntro: string,
  chineseIntro: string,
  wikiDocuments: GeneratedWikiDocument[]
) {
  const installationDoc = wikiDocuments.find((item) => /安装|部署|开始|setup|install/i.test(item.title));
  const usageDoc = wikiDocuments.find((item) => /使用|上手|命令|示例|usage|quick start/i.test(item.title));
  const scenarioDoc = wikiDocuments.find((item) => /场景|适用|问题|用途|scenario|use case/i.test(item.title));

  return [
    {
      question: `${projectName} 是做什么的？`,
      answer: oneLineIntro || chineseIntro.slice(0, 90) || `${projectName} 是一个开源项目。`,
    },
    {
      question: `${projectName} 适合用在什么场景？`,
      answer: scenarioDoc?.content || chineseIntro.slice(0, 110) || '从当前仓库信息来看，它适合用在与仓库主题相关的技术场景中。',
    },
    {
      question: `${projectName} 如何安装？`,
      answer: installationDoc?.content || '仓库中未明确给出完整安装步骤，建议先查看 README 或项目主页中的安装说明。',
    },
    {
      question: `${projectName} 如何开始使用？`,
      answer: usageDoc?.content || '仓库中未明确给出完整使用步骤，建议结合 README、示例代码或文档章节开始上手。',
    },
  ].slice(0, 4);
}

function normalizeGeneratedContent(projectName: string, parsed: {
  oneLineIntro?: unknown;
  chineseIntro?: unknown;
  wikiDocuments?: unknown;
  mindMap?: unknown;
}): GeneratedContentResult {
  const wikiDocuments = normalizeWikiDocuments(parsed.wikiDocuments);
  const mindMap = sanitizeMindMapNode(parsed.mindMap, projectName);

  return {
    oneLineIntro: normalizeTextField(parsed.oneLineIntro, '暂未生成简介。'),
    chineseIntro: normalizeTextField(parsed.chineseIntro, '暂未生成详细介绍。'),
    wikiDocuments,
    mindMap,
  };
}

function normalizeGeneratedSeo(projectName: string, contentResult: GeneratedContentResult, parsed: {
  projectType?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
  faqItems?: unknown;
}): GeneratedSeoResult {
  const projectType = normalizeTextField(
    parsed.projectType,
    inferProjectTypeFromContent(projectName, contentResult.chineseIntro, contentResult.wikiDocuments)
  );
  const faqItems = normalizeFaqItems(parsed.faqItems);
  const generatedTitle = normalizeTextField(parsed.seoTitle, '');
  const generatedDescription = normalizeTextField(parsed.seoDescription, '');
  const fallbackTitle = buildFallbackSeoTitle(projectName, projectType);
  const fallbackDescription = buildFallbackSeoDescription(
    projectName,
    contentResult.oneLineIntro,
    contentResult.chineseIntro,
    projectType
  );

  return {
    projectType,
    seoTitle: getSeoTitleQualityIssue(generatedTitle, projectName) ? fallbackTitle : generatedTitle,
    seoDescription: getSeoDescriptionQualityIssue(generatedDescription, projectName)
      ? fallbackDescription
      : generatedDescription,
    faqItems: faqItems.length > 0
      ? faqItems
      : buildFallbackFaqItems(projectName, contentResult.oneLineIntro, contentResult.chineseIntro, contentResult.wikiDocuments),
  };
}

function normalizeGeneratedProject(projectName: string, parsed: {
  oneLineIntro?: unknown;
  chineseIntro?: unknown;
  wikiDocuments?: unknown;
  mindMap?: unknown;
  projectType?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
  faqItems?: unknown;
}): GeneratedProjectResult {
  const contentResult = normalizeGeneratedContent(projectName, parsed);
  const seoResult = normalizeGeneratedSeo(projectName, contentResult, parsed);

  return {
    ...contentResult,
    ...seoResult,
  };
}

export class LLMClient {
  private config: LLMConfig;
  private static readonly REQUEST_TIMEOUT = 60000;
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 2000;

  constructor(config: LLMConfig) {
    this.config = {
      ...config,
      baseUrl: trimTrailingSlash(config.baseUrl),
      apiFormat: normalizeApiFormat(config.apiFormat, trimTrailingSlash(config.baseUrl)),
    };
  }

  private get isAnthropicCompatible() {
    return this.config.apiFormat === 'anthropic';
  }

  private get isStepFunOpenAICompatible() {
    return this.config.apiFormat === 'openai' && /stepfun\.com/i.test(this.config.baseUrl);
  }

  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status && status >= 500) return true;
      if (!error.response && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ERR_NETWORK')) return true;
    }
    return false;
  }

  private async sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private getRequestLogLabel(attempt: number, messages: ChatMessage[]) {
    return [
      `format=${this.config.apiFormat}`,
      `model=${this.config.model}`,
      `baseUrl=${this.config.baseUrl}`,
      `apiKey=${maskApiKey(this.config.apiKey)}`,
      `attempt=${attempt + 1}/${LLMClient.MAX_RETRIES + 1}`,
      `messages=${messages.length}`,
    ].join(' ');
  }

  async chat(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const { temperature = 0.4, maxTokens = 2000 } = options;
    let lastError: unknown;

    for (let attempt = 0; attempt <= LLMClient.MAX_RETRIES; attempt += 1) {
      if (attempt > 0) {
        const delay = LLMClient.BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`LLM request retry #${attempt} after ${delay}ms...`);
        await this.sleep(delay);
      }

      try {
        console.log(`[LLM Request] start ${this.getRequestLogLabel(attempt, messages)}`);

        if (this.isAnthropicCompatible) {
          const systemPrompt = messages
            .filter((message) => message.role === 'system')
            .map((message) => message.content)
            .join('\n\n');

          const response = await axios.post<AnthropicResponse>(
            `${this.config.baseUrl}/v1/messages`,
            {
              model: this.config.model,
              max_tokens: maxTokens,
              temperature,
              ...(systemPrompt ? { system: systemPrompt } : {}),
              messages: messages
                .filter((message) => message.role !== 'system')
                .map((message) => ({
                  role: message.role,
                  content: message.content,
                })),
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': this.config.apiKey,
              },
              timeout: LLMClient.REQUEST_TIMEOUT,
            }
          );

          const content = response.data.content
            ?.filter((item) => item.type === 'text' && item.text)
            .map((item) => item.text)
            .join('\n')
            .trim();

          if (!content) {
            throw new Error('Anthropic-compatible API returned an empty response.');
          }

          console.log(`[LLM Request] success ${this.getRequestLogLabel(attempt, messages)} chars=${content.length}`);
          return content;
        }

        const client = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl,
          timeout: LLMClient.REQUEST_TIMEOUT,
          maxRetries: 0,
        });

        const createOpenAICompletion = async (tokenLimit?: number) =>
          client.chat.completions.create({
            model: this.config.model,
            messages: messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            temperature,
            ...(typeof tokenLimit === 'number' ? { max_tokens: tokenLimit } : {}),
          });

        let response = await createOpenAICompletion(maxTokens);
        let parsedResponse = extractOpenAIChoicePayload(response.choices?.[0]);

        if (
          !parsedResponse.content &&
          this.isStepFunOpenAICompatible &&
          parsedResponse.reasoning &&
          parsedResponse.finishReason === 'length'
        ) {
          console.warn(
            `[LLM Request] StepFun reasoning-only response detected ${this.getRequestLogLabel(attempt, messages)} finish_reason=${parsedResponse.finishReason} retry=without_max_tokens`
          );
          response = await createOpenAICompletion();
          parsedResponse = extractOpenAIChoicePayload(response.choices?.[0]);
        }

        if (!parsedResponse.content && parsedResponse.reasoning) {
          const reasoningJson = tryParseJsonFromText(parsedResponse.reasoning);
          if (reasoningJson) {
            console.warn(
              `[LLM Request] OpenAI-compatible response missing content, using parseable reasoning payload ${this.getRequestLogLabel(attempt, messages)}`
            );
            return parsedResponse.reasoning;
          }
        }

        if (!parsedResponse.content) {
          const details = [
            parsedResponse.finishReason ? `finish_reason=${parsedResponse.finishReason}` : '',
            parsedResponse.reasoning ? `reasoning_chars=${parsedResponse.reasoning.length}` : '',
          ]
            .filter(Boolean)
            .join(' ');
          throw new Error(
            `OpenAI-compatible API returned an empty response${details ? ` (${details})` : ''}.`
          );
        }

        console.log(
          `[LLM Request] success ${this.getRequestLogLabel(attempt, messages)} chars=${parsedResponse.content.length}`
        );
        return parsedResponse.content;
      } catch (error) {
        lastError = error;
        console.warn(
          `[LLM Request] failed ${this.getRequestLogLabel(attempt, messages)} reason=${extractErrorMessage(error, 'LLM request failed')}`
        );
        if (attempt < LLMClient.MAX_RETRIES && this.isRetryableError(error)) {
          continue;
        }
        break;
      }
    }

    console.error('LLM request failed:', lastError);
    throw new Error(extractErrorMessage(lastError, 'LLM request failed'));
  }

  private async repairJsonResponse(rawText: string) {
    return this.repairJsonResponseWithSnapshot(rawText, null);
  }

  private async repairJsonResponseWithSnapshot(rawText: string, promptSnapshot: PipelinePromptSnapshot | null) {
    const systemPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_JSON_REPAIR_SYSTEM');
    const userPrompt = renderPromptTemplate(getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_JSON_REPAIR_USER'), {
      rawText,
    });

    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0, maxTokens: 3200 }
    );
  }

  async analyzeRepository(
    projectName: string,
    description: string | null,
    scan: RepositoryScanResult
  ): Promise<RepositoryAnalysisResult> {
    const promptSnapshot = scan.promptSnapshot || null;
    const systemPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_REPO_ANALYSIS_SYSTEM');
    const userPrompt = renderPromptTemplate(getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_REPO_ANALYSIS_USER'), {
      projectName,
      description: description || '无',
      readmeContent: scan.readme.slice(0, 4500) || '无 README 内容',
      codeStructure: scan.structure.slice(0, 2200) || '无代码结构信息',
      repositoryFacts: scan.facts.slice(0, 4000) || '无关键文件事实',
      candidateFiles: scan.candidateFiles.join('\n') || '无候选关键文件',
    });

    try {
      const result = await this.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 1800 }
      );

      try {
        return normalizeRepositoryAnalysis(parseJsonFromText(result), projectName);
      } catch {
        const repaired = await this.repairJsonResponseWithSnapshot(result, promptSnapshot);
        return normalizeRepositoryAnalysis(parseJsonFromText(repaired), projectName);
      }
      } catch (error) {
        console.warn(
          `[LLM Analyze] fallback project=${projectName} reason=${extractErrorMessage(error, 'Repository analysis failed')}`
        );
        return {
          projectType: 'unknown',
        summary: `${projectName} 是一个开源项目，当前仓库分析阶段未能返回完整结构化结果。`,
        problemSolved: '仓库中未明确给出完整的问题定义。',
        useCases: [],
        installGuide: [],
        usageGuide: [],
        mainModules: [],
        recommendedFiles: scan.candidateFiles.slice(0, 6),
        shouldGenerateMindMap: false,
        confidence: 'low',
      };
    }
  }

  async deepReadRepository(
    projectName: string,
    description: string | null,
    analysis: RepositoryAnalysisResult,
    files: Array<{ path: string; content: string }>,
    promptSnapshot: PipelinePromptSnapshot | null = null
  ): Promise<RepositoryDeepReadResult> {
    const systemPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_DEEP_READ_SYSTEM');
    const selectedFileContents = files
      .map((file) => `## ${file.path}\n\`\`\`\n${file.content.slice(0, 3200)}\n\`\`\``)
      .join('\n\n')
      .slice(0, 14000);
    const userPrompt = renderPromptTemplate(getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_DEEP_READ_USER'), {
      projectName,
      description: description || '无',
      repositoryAnalysis: JSON.stringify(analysis, null, 2),
      selectedFileContents: selectedFileContents || '无可深读的关键文件内容',
    });

    if (!selectedFileContents) {
      return {
        keyFileSummaries: [],
        architectureNotes: [],
        installEvidence: [],
        usageEvidence: [],
        moduleMap: [],
        reasoningSummary: '当前没有可供深读的关键文件内容。',
      };
    }

    try {
      const result = await this.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 2200 }
      );

      try {
        return normalizeRepositoryDeepRead(parseJsonFromText(result));
      } catch {
        const repaired = await this.repairJsonResponseWithSnapshot(result, promptSnapshot);
        return normalizeRepositoryDeepRead(parseJsonFromText(repaired));
      }
      } catch (error) {
        console.warn(
          `[LLM Deep Read] fallback project=${projectName} reason=${extractErrorMessage(error, 'Repository deep read failed')}`
        );
        return {
          keyFileSummaries: files.map((file) => ({
          path: file.path,
          summary: '已读取该文件，但深读阶段未返回结构化总结。',
        })),
        architectureNotes: [],
        installEvidence: [],
        usageEvidence: [],
        moduleMap: [],
        reasoningSummary: '深读阶段失败，暂时只保留文件级证据。',
      };
    }
  }

  private async generateFallbackJson(
    projectName: string,
    description: string | null,
    readmeContent: string,
    codeStructure: string,
    repositoryFacts = '',
    repositoryAnalysis = '',
    deepReadEvidence = '',
    promptSnapshot: PipelinePromptSnapshot | null = null
  ) {
    const systemPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_FALLBACK_SYSTEM');
    const userPrompt = renderPromptTemplate(getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_FALLBACK_USER'), {
      projectName,
      description: description || '无',
      readmeContent: readmeContent.slice(0, 5000) || '无 README 内容',
      codeStructure: codeStructure || '无代码结构信息',
      repositoryFacts: repositoryFacts.slice(0, 6000) || '无额外仓库事实信息',
      repositoryAnalysis: repositoryAnalysis.slice(0, 5000) || '无仓库分析摘要',
      deepReadEvidence: deepReadEvidence.slice(0, 7000) || '无深读代码证据',
    });

    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.2, maxTokens: 2800 }
    );
  }

  async generateAllContent(
    projectName: string,
    description: string | null,
    readmeContent: string,
    codeStructure: string,
    repositoryFacts = '',
    repositoryAnalysis = '',
    deepReadEvidence = '',
    promptSnapshot: PipelinePromptSnapshot | null = null
  ): Promise<GeneratedProjectResult> {
    const systemPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_CONTENT_SYSTEM');
    const contentPrompt = renderPromptTemplate(getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_CONTENT_USER'), {
      projectName,
      description: description || '无',
      readmeContent: readmeContent.slice(0, 4500) || '无 README 内容',
      codeStructure: codeStructure.slice(0, 1800) || '无代码结构信息',
      repositoryFacts: repositoryFacts.slice(0, 4500) || '无额外仓库事实信息',
      repositoryAnalysis: repositoryAnalysis.slice(0, 5000) || '无仓库分析摘要',
      deepReadEvidence: deepReadEvidence.slice(0, 7000) || '无深读代码证据',
    });
    const outputFormatPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_CONTENT_OUTPUT_FORMAT');
    const userPrompt = [contentPrompt, outputFormatPrompt].filter(Boolean).join('\n\n');

    try {
      const result = await this.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.35, maxTokens: 3200 }
      );

      try {
        const parsed = parseJsonFromText(result) as {
          oneLineIntro?: unknown;
          chineseIntro?: unknown;
          wikiDocuments?: unknown;
          mindMap?: unknown;
          projectType?: unknown;
          seoTitle?: unknown;
          seoDescription?: unknown;
          faqItems?: unknown;
        };
        return normalizeGeneratedProject(projectName, parsed);
      } catch {
        try {
          const repaired = await this.repairJsonResponseWithSnapshot(result, promptSnapshot);
          const repairedParsed = parseJsonFromText(repaired) as {
            oneLineIntro?: unknown;
            chineseIntro?: unknown;
            wikiDocuments?: unknown;
            mindMap?: unknown;
            projectType?: unknown;
            seoTitle?: unknown;
            seoDescription?: unknown;
            faqItems?: unknown;
          };
          return normalizeGeneratedProject(projectName, repairedParsed);
        } catch {
          const fallbackText = await this.generateFallbackJson(
            projectName,
            description,
            readmeContent,
            codeStructure,
            repositoryFacts,
            repositoryAnalysis,
            deepReadEvidence,
            promptSnapshot
          );
          const fallbackParsed = parseJsonFromText(fallbackText) as {
            oneLineIntro?: unknown;
            chineseIntro?: unknown;
            wikiDocuments?: unknown;
            mindMap?: unknown;
            projectType?: unknown;
            seoTitle?: unknown;
            seoDescription?: unknown;
            faqItems?: unknown;
          };
          console.error('Failed to parse LLM response, used fallback JSON.');
          return normalizeGeneratedProject(projectName, fallbackParsed);
        }
      }
    } catch (error) {
      console.warn(
        `[LLM Content] primary generation failed project=${projectName} reason=${extractErrorMessage(error, 'Repository content generation failed')}`
      );

      try {
        const fallbackText = await this.generateFallbackJson(
          projectName,
          description,
          readmeContent,
          codeStructure,
          repositoryFacts,
          repositoryAnalysis,
          deepReadEvidence,
          promptSnapshot
        );
        const fallbackParsed = parseJsonFromText(fallbackText) as {
          oneLineIntro?: unknown;
          chineseIntro?: unknown;
          wikiDocuments?: unknown;
          mindMap?: unknown;
          projectType?: unknown;
          seoTitle?: unknown;
          seoDescription?: unknown;
          faqItems?: unknown;
        };
        console.warn(`[LLM Content] fallback JSON used project=${projectName}`);
        return normalizeGeneratedProject(projectName, fallbackParsed);
      } catch (fallbackError) {
        console.warn(
          `[LLM Content] deterministic fallback project=${projectName} reason=${extractErrorMessage(fallbackError, 'Fallback JSON generation failed')}`
        );
        return normalizeGeneratedProject(projectName, {});
      }
    }
  }

  async generateSeoContent(
    projectName: string,
    description: string | null,
    readmeContent: string,
    codeStructure: string,
    repositoryFacts: string,
    contentResult: GeneratedContentResult,
    repositoryAnalysis = '',
    deepReadEvidence = '',
    promptSnapshot: PipelinePromptSnapshot | null = null
  ): Promise<GeneratedSeoResult> {
    const systemPrompt = getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_SEO_SYSTEM');
    const userPrompt = renderPromptTemplate(getPromptValueFromSnapshot(promptSnapshot, 'PROMPT_SEO_USER'), {
      projectName,
      description: description || '无',
      oneLineIntro: contentResult.oneLineIntro,
      chineseIntro: contentResult.chineseIntro,
      readmeContent: readmeContent.slice(0, 5000) || '无 README 内容',
      codeStructure: codeStructure || '无代码结构信息',
      repositoryFacts: repositoryFacts.slice(0, 6000) || '无额外仓库事实信息',
      repositoryAnalysis: repositoryAnalysis.slice(0, 5000) || '无仓库分析摘要',
      deepReadEvidence: deepReadEvidence.slice(0, 7000) || '无深读代码证据',
      wikiSummary: summarizeWikiForPrompt(contentResult.wikiDocuments) || '无 Wiki 摘要',
    });

    try {
      const result = await this.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.2, maxTokens: 2200 }
      );

      try {
        const parsed = parseJsonFromText(result) as {
          projectType?: unknown;
          seoTitle?: unknown;
          seoDescription?: unknown;
          faqItems?: unknown;
        };
        return normalizeGeneratedSeo(projectName, contentResult, parsed);
      } catch {
        const repaired = await this.repairJsonResponseWithSnapshot(result, promptSnapshot);
        const parsed = parseJsonFromText(repaired) as {
          projectType?: unknown;
          seoTitle?: unknown;
          seoDescription?: unknown;
          faqItems?: unknown;
        };
        return normalizeGeneratedSeo(projectName, contentResult, parsed);
      }
    } catch (error) {
      console.warn(
        `[LLM SEO] fallback project=${projectName} reason=${extractErrorMessage(error, 'Repository SEO generation failed')}`
      );
      return normalizeGeneratedSeo(projectName, contentResult, {});
    }
  }
}
