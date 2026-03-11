import axios from 'axios';

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

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

function parseJsonFromText(text: string) {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
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

function parseDelimitedContent(text: string) {
  const normalized = text.replace(/\r\n/g, '\n');
  const oneLineMatch = normalized.match(/\[ONE_LINE\]\s*([\s\S]*?)\s*(?=\[INTRO\]|$)/);
  const introMatch = normalized.match(/\[INTRO\]\s*([\s\S]*?)\s*(?=\[WIKI\]|$)/);
  const wikiSection = normalized.match(/\[WIKI\]\s*([\s\S]*)$/)?.[1] || '';

  const wikiDocuments = wikiSection
    .split(/\n(?=\d+\.\s)/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const titleMatch = block.match(/^\d+\.\s*(.+)$/m);
      const contentMatch = block.match(/CONTENT:\s*([\s\S]*)$/m);
      return {
        title: titleMatch?.[1]?.replace(/^TITLE:\s*/i, '').trim() || '',
        content: contentMatch?.[1]?.trim() || '',
      };
    })
    .filter((item) => item.title && item.content)
    .slice(0, 6);

  return {
    oneLineIntro: oneLineMatch?.[1]?.trim() || '暂未生成简介。',
    chineseIntro: introMatch?.[1]?.trim() || '暂未生成详细介绍。',
    wikiDocuments,
  };
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      ...config,
      baseUrl: trimTrailingSlash(config.baseUrl),
    };
  }

  private get isAnthropicCompatible() {
    return this.config.baseUrl.includes('/anthropic');
  }

  async chat(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const { temperature = 0.4, maxTokens = 2000 } = options;

    try {
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

        return content;
      }

      const response = await axios.post<OpenAIResponse>(
        `${this.config.baseUrl}/v1/chat/completions`,
        {
          model: this.config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      const content = response.data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Chat completions API returned an empty response.');
      }

      return content;
    } catch (error) {
      console.error('LLM request failed:', error);
      throw new Error(extractErrorMessage(error, 'LLM request failed'));
    }
  }

  private async repairJsonResponse(rawText: string) {
    return this.chat(
      [
        {
          role: 'system',
          content: 'You repair malformed JSON. Return only valid JSON. Do not add explanation.',
        },
        {
          role: 'user',
          content: `Convert the following content into valid JSON without changing the meaning.\n\n${rawText}`,
        },
      ],
      { temperature: 0, maxTokens: 3200 }
    );
  }

  private async generateDelimitedFallback(
    projectName: string,
    description: string | null,
    readmeContent: string,
    codeStructure: string,
    repositoryFacts = ''
  ) {
    return this.chat(
      [
        {
          role: 'system',
          content: '你是技术编辑。只输出指定分隔符结构，不要输出 JSON，不要输出额外解释。',
        },
        {
          role: 'user',
          content: `请基于以下仓库信息生成中文内容。\n\n项目名称: ${projectName}\n原始描述: ${description || '无'}\n\nREADME:\n${readmeContent.slice(0, 5000) || '无'}\n\n仓库结构:\n${codeStructure || '无'}\n\n关键事实:\n${repositoryFacts.slice(0, 6000) || '无'}\n\n严格按下面格式输出：\n[ONE_LINE]\n一句话简介\n[INTRO]\n一段到两段中文介绍\n[WIKI]\n1. TITLE: 章节标题\nCONTENT: 章节正文\n2. TITLE: 章节标题\nCONTENT: 章节正文\n3. TITLE: 章节标题\nCONTENT: 章节正文\n4. TITLE: 章节标题\nCONTENT: 章节正文\n\n要求：\n1. 全部用中文。\n2. 不要虚构仓库没有体现的信息。\n3. 生成 4 到 6 个章节。\n4. 不要输出格式说明，只输出结果。`,
        },
      ],
      { temperature: 0.3, maxTokens: 2800 }
    );
  }

  async generateAllContent(
    projectName: string,
    description: string | null,
    readmeContent: string,
    codeStructure: string,
    repositoryFacts = ''
  ): Promise<{
    oneLineIntro: string;
    chineseIntro: string;
    wikiDocuments: Array<{ title: string; content: string }>;
  }> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一名技术内容策划专家，擅长基于 GitHub 仓库事实信息生成准确、凝练、结构化的中文项目介绍与 Wiki。禁止虚构仓库中不存在的能力、接口或技术栈。',
      },
      {
        role: 'user',
        content: `请基于以下 GitHub 项目事实信息生成中文介绍和 Wiki 内容。
项目名称: ${projectName}
原始描述: ${description || '无'}

README 摘要:
${readmeContent.slice(0, 7000) || '无 README 内容'}

仓库结构:
${codeStructure || '无代码结构信息'}

关键文件与依赖事实:
${repositoryFacts.slice(0, 9000) || '无额外事实信息'}

请严格输出 JSON，不要输出任何额外说明。格式如下:
{
  "oneLineIntro": "40-80 字中文一句话介绍",
  "chineseIntro": "180-320 字中文介绍，使用 \\n 分段",
  "wikiDocuments": [
    {
      "title": "章节标题",
      "content": "120-260 字中文正文，聚焦一个明确主题"
    }
  ]
}

要求:
1. 全部内容必须使用中文。
2. 只能依据提供的信息总结，不得虚构仓库中没有出现的特性、接口、命令或架构。
3. oneLineIntro 要突出项目定位和核心价值。
4. chineseIntro 要覆盖主要功能、技术特点、适用场景。
5. wikiDocuments 生成 4-6 个章节，每个章节主题明确、彼此不重复，正文不能只是提纲句子。
6. 如果信息不足，明确写成“从当前仓库信息可见”或“仓库中已体现”，不要脑补。
7. 严格返回合法 JSON。`,
      },
    ];

    const result = await this.chat(messages, { temperature: 0.5, maxTokens: 3200 });

    try {
      const parsed = parseJsonFromText(result) as {
        oneLineIntro?: string;
        chineseIntro?: string;
        wikiDocuments?: Array<{ title?: string; content?: string }>;
      };

      return {
        oneLineIntro: parsed.oneLineIntro?.trim() || '暂未生成简介。',
        chineseIntro: parsed.chineseIntro?.trim() || '暂未生成详细介绍。',
        wikiDocuments: (parsed.wikiDocuments || [])
          .filter((item) => item?.title && item?.content)
          .slice(0, 6)
          .map((item) => ({
            title: item.title!.trim(),
            content: item.content!.trim(),
          })),
      };
    } catch (error) {
      try {
        const repaired = await this.repairJsonResponse(result);
        const repairedParsed = parseJsonFromText(repaired) as {
          oneLineIntro?: string;
          chineseIntro?: string;
          wikiDocuments?: Array<{ title?: string; content?: string }>;
        };

        return {
          oneLineIntro: repairedParsed.oneLineIntro?.trim() || '暂未生成简介。',
          chineseIntro: repairedParsed.chineseIntro?.trim() || '暂未生成详细介绍。',
          wikiDocuments: (repairedParsed.wikiDocuments || [])
            .filter((item) => item?.title && item?.content)
            .slice(0, 6)
            .map((item) => ({
              title: item.title!.trim(),
              content: item.content!.trim(),
            })),
        };
      } catch {
        try {
          const fallbackText = await this.generateDelimitedFallback(
            projectName,
            description,
            readmeContent,
            codeStructure,
            repositoryFacts
          );

          return parseDelimitedContent(fallbackText);
        } catch (fallbackError) {
          console.error('Failed to parse LLM response:', error);
          throw new Error(
            fallbackError instanceof Error
              ? `Failed to parse LLM response: ${fallbackError.message}`
              : 'Failed to parse LLM response.'
          );
        }
      }
    }
  }
}
