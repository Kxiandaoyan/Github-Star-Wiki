import { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { syncApiKeysFromEnv } from '@/lib/api-keys';
import { reloadRuntimeServices } from '@/lib/app';
import { formatRuntimeModelSummary, getRuntimeModelSummary } from '@/lib/model-runtime';
import { getSettingsByCategory, saveSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  return apiSuccess({ settings: getSettingsByCategory() }, '已获取后台设置。');
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const updates = typeof body.settings === 'object' && body.settings !== null
      ? Object.fromEntries(
        Object.entries(body.settings as Record<string, unknown>).map(([key, value]) => [key, String(value ?? '')])
      )
      : {};

    saveSettings(updates);
    syncApiKeysFromEnv();
    await reloadRuntimeServices();
    const runtimeSummary = getRuntimeModelSummary();
    const runtimeSummaryText = formatRuntimeModelSummary(runtimeSummary);
    return apiSuccess(
      {
        settings: getSettingsByCategory(),
        runtimeSummary,
        detailMessage: `当前生效模型配置: ${runtimeSummaryText}`,
      },
      '设置已保存并重新加载。'
    );
  } catch (error) {
    return apiError('保存设置失败。', 500, 'SAVE_SETTINGS_FAILED', error instanceof Error ? error.message : undefined);
  }
}
