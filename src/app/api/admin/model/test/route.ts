import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { requireAdminApi } from '@/lib/admin-auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { LLMClient } from '@/lib/llm';
import {
  formatRuntimeModelSummary,
  getActiveRuntimeApiKey,
  getRuntimeModelSummary,
  maskApiKey,
} from '@/lib/model-runtime';

interface ModelTestResult {
  label: string;
  model: string;
  latencyMs: number;
  replyPreview: string;
  responseChannel: 'content' | 'reasoning';
  finishReason: string | null;
}

function buildDetailMessage(summaryText: string, tests: ModelTestResult[]) {
  const testLines = tests.map((item) =>
    `${item.label}(${item.model}) ${item.latencyMs}ms [${item.responseChannel}/${item.finishReason || 'unknown'}]: ${item.replyPreview}`
  );

  return [`当前生效配置: ${summaryText}`, ...testLines].join('\n');
}

function extractOpenAICompatibleText(message: unknown) {
  const parsed = (message && typeof message === 'object' ? message : {}) as {
    content?: unknown;
    reasoning?: unknown;
    reasoning_content?: unknown;
  };

  if (typeof parsed.content === 'string' && parsed.content.trim()) {
    return {
      text: parsed.content.trim(),
      responseChannel: 'content' as const,
    };
  }

  if (Array.isArray(parsed.content)) {
    const contentText = parsed.content
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

    if (contentText) {
      return {
        text: contentText,
        responseChannel: 'content' as const,
      };
    }
  }

  const reasoning = [parsed.reasoning, parsed.reasoning_content]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('\n')
    .trim();

  if (reasoning) {
    return {
      text: reasoning,
      responseChannel: 'reasoning' as const,
    };
  }

  return null;
}

async function runSingleModelTest(
  label: string,
  model: string,
  apiKey: NonNullable<ReturnType<typeof getActiveRuntimeApiKey>>,
  apiFormat: string
) {
  const startedAt = Date.now();
  const normalizedFormat = apiFormat.trim().toLowerCase();

  if (normalizedFormat === 'openai') {
    const client = new OpenAI({
      apiKey: apiKey.api_key,
      baseURL: apiKey.base_url,
      timeout: 60000,
      maxRetries: 0,
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a connectivity test assistant. Reply with exactly OK.' },
        { role: 'user', content: 'Reply with exactly OK.' },
      ],
      temperature: 0,
      max_tokens: 192,
    });

    const choice = response.choices?.[0];
    const extracted = extractOpenAICompatibleText(choice?.message);

    if (!extracted?.text) {
      throw new Error(`OpenAI-compatible API returned empty content. finish_reason=${choice?.finish_reason || 'unknown'}`);
    }

    return {
      label,
      model,
      latencyMs: Date.now() - startedAt,
      replyPreview: extracted.text.slice(0, 80),
      responseChannel: extracted.responseChannel,
      finishReason: choice?.finish_reason || null,
    } satisfies ModelTestResult;
  }

  const client = new LLMClient({
    apiKey: apiKey.api_key,
    baseUrl: apiKey.base_url,
    apiFormat,
    model,
  });

  const reply = await client.chat(
    [
      { role: 'system', content: '你是模型连通性测试助手，请只回复 OK。' },
      { role: 'user', content: '请只回复 OK。' },
    ],
    { temperature: 0, maxTokens: 64 }
  );

  return {
    label,
    model,
    latencyMs: Date.now() - startedAt,
    replyPreview: reply.slice(0, 80),
    responseChannel: 'content',
    finishReason: 'stop',
  } satisfies ModelTestResult;
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  const runtimeSummary = getRuntimeModelSummary();
  const runtimeSummaryText = formatRuntimeModelSummary(runtimeSummary);
  const activeKey = getActiveRuntimeApiKey();

  if (!activeKey) {
    return apiError('当前没有可用的模型 API Key，无法执行连通性测试。', 400, 'MODEL_API_KEY_UNAVAILABLE', {
      runtimeSummary,
      runtimeSummaryText,
      detailMessage: `当前生效配置: ${runtimeSummaryText}`,
    });
  }

  console.log(
    `[Admin Model Test] start ${runtimeSummaryText} key=${maskApiKey(activeKey.api_key)} baseUrl=${activeKey.base_url}`
  );

  try {
    const tests: ModelTestResult[] = [];
    tests.push(await runSingleModelTest('主模型', runtimeSummary.model, activeKey, runtimeSummary.apiFormat));

    if (runtimeSummary.analysisModel !== runtimeSummary.model) {
      tests.push(await runSingleModelTest('分析模型', runtimeSummary.analysisModel, activeKey, runtimeSummary.apiFormat));
    }

    const detailMessage = buildDetailMessage(runtimeSummaryText, tests);
    console.log(`[Admin Model Test] success ${detailMessage.replace(/\n/g, ' | ')}`);

    return apiSuccess(
      {
        runtimeSummary,
        runtimeSummaryText,
        tests,
        detailMessage,
      },
      '模型连接测试成功。'
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : '未知错误';
    console.error(`[Admin Model Test] failed ${runtimeSummaryText} reason=${reason}`);

    return apiError('模型连接测试失败。', 500, 'MODEL_TEST_FAILED', {
      runtimeSummary,
      runtimeSummaryText,
      reason,
      detailMessage: `当前生效配置: ${runtimeSummaryText}\n失败原因: ${reason}`,
    });
  }
}
