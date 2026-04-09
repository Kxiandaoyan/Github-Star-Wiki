import db from './db';
import { getSettingValue } from './settings';

interface ApiKeyRow {
  id: number;
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  priority: number;
  is_active: number;
  daily_limit: number;
  daily_used: number;
}

export interface RuntimeModelSummary {
  apiFormat: string;
  baseUrl: string;
  model: string;
  analysisModel: string;
  envKeyCount: number;
  dbKeyCount: number;
  activeKeyMasked: string;
  activeKeyName: string;
  activeKeyPriority: number | null;
  activeBaseUrl: string;
  activeStoredModel: string;
}

function countRawKeys(rawValue: string | undefined) {
  return rawValue
    ?.split(',')
    .map((key) => key.trim())
    .filter(Boolean).length ?? 0;
}

export function maskApiKey(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return 'none';
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}...${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

export function getActiveRuntimeApiKey() {
  return db.prepare(`
    SELECT id, name, api_key, base_url, model, priority, is_active, daily_limit, daily_used
    FROM api_keys
    WHERE is_active = 1 AND daily_used < daily_limit
    ORDER BY priority ASC, daily_used ASC, id ASC
    LIMIT 1
  `).get() as ApiKeyRow | undefined;
}

export function getRuntimeModelSummary(): RuntimeModelSummary {
  const activeKey = getActiveRuntimeApiKey();
  const dbKeyCount = (db.prepare('SELECT COUNT(*) as count FROM api_keys').get() as { count: number }).count;
  const model = getSettingValue('MODEL_NAME').trim() || 'glm-4';
  const analysisModel = getSettingValue('MODEL_ANALYSIS_NAME').trim() || model;

  return {
    apiFormat: getSettingValue('MODEL_API_FORMAT').trim() || 'anthropic',
    baseUrl: getSettingValue('MODEL_BASE_URL').trim() || 'https://open.bigmodel.cn/api/anthropic',
    model,
    analysisModel,
    envKeyCount: countRawKeys(process.env.MODEL_API_KEYS),
    dbKeyCount,
    activeKeyMasked: maskApiKey(activeKey?.api_key),
    activeKeyName: activeKey?.name || 'none',
    activeKeyPriority: activeKey?.priority ?? null,
    activeBaseUrl: activeKey?.base_url || '',
    activeStoredModel: activeKey?.model || '',
  };
}

export function formatRuntimeModelSummary(summary: RuntimeModelSummary) {
  return [
    `format=${summary.apiFormat}`,
    `baseUrl=${summary.baseUrl}`,
    `model=${summary.model}`,
    `analysisModel=${summary.analysisModel}`,
    `envKeys=${summary.envKeyCount}`,
    `dbKeys=${summary.dbKeyCount}`,
    `activeKey=${summary.activeKeyMasked}`,
    `activeKeyName=${summary.activeKeyName}`,
    `activePriority=${summary.activeKeyPriority ?? 'none'}`,
    `activeBaseUrl=${summary.activeBaseUrl || 'none'}`,
    `activeStoredModel=${summary.activeStoredModel || 'none'}`,
  ].join(' ');
}

export function logRuntimeModelSummary(context: string) {
  const summary = getRuntimeModelSummary();
  console.log(`[Model Runtime] context=${context} ${formatRuntimeModelSummary(summary)}`);
  return summary;
}
