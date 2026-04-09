import { NextRequest } from 'next/server';
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
}

function buildDetailMessage(summaryText: string, tests: ModelTestResult[]) {
  const testLines = tests.map((item) => `${item.label}(${item.model}) ${item.latencyMs}ms: ${item.replyPreview}`);
  return [`当前生效配置: ${summaryText}`, ...testLines].join('\n');
}

async function runSingleModelTest(
  label: string,
  model: string,
  apiKey: NonNullable<ReturnType<typeof getActiveRuntimeApiKey>>,
  apiFormat: string
) {
  const client = new LLMClient({
    apiKey: apiKey.api_key,
    baseUrl: apiKey.base_url,
    apiFormat,
    model,
  });

  const startedAt = Date.now();
  const reply = await client.chat(
    [
      { role: 'system', content: '你是模型连通性测试助手，请只回复 OK。' },
      { role: 'user', content: '请只回复 OK。' },
    ],
    { temperature: 0, maxTokens: 20 }
  );

  return {
    label,
    model,
    latencyMs: Date.now() - startedAt,
    replyPreview: reply.slice(0, 80),
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
