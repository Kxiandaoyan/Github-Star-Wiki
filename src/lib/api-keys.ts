import db from './db';

interface EnvApiKeyRecord {
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  priority: number;
}

function getEnvApiKeys(): EnvApiKeyRecord[] {
  const rawKeys = process.env.GLM_API_KEYS
    ?.split(',')
    .map((key) => key.trim())
    .filter(Boolean) ?? [];

  const baseUrl = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic';
  const model = process.env.GLM_MODEL || 'glm-4';

  return rawKeys.map((apiKey, index) => ({
    name: `GLM-Key-${index + 1}`,
    api_key: apiKey,
    base_url: baseUrl,
    model,
    priority: index + 1,
  }));
}

export function syncApiKeysFromEnv() {
  const envKeys = getEnvApiKeys();

  if (envKeys.length === 0) {
    console.warn('No GLM API keys found in environment variables.');
    return;
  }

  const currentKeys = db.prepare(`
    SELECT name, api_key, base_url, model, priority
    FROM api_keys
    ORDER BY priority ASC, id ASC
  `).all() as EnvApiKeyRecord[];

  const isSameConfig = currentKeys.length === envKeys.length && currentKeys.every((currentKey, index) => {
    const envKey = envKeys[index];
    return currentKey.name === envKey.name
      && currentKey.api_key === envKey.api_key
      && currentKey.base_url === envKey.base_url
      && currentKey.model === envKey.model
      && currentKey.priority === envKey.priority;
  });

  if (isSameConfig) {
    return;
  }

  const replaceKeys = db.transaction((records: EnvApiKeyRecord[]) => {
    db.prepare('DELETE FROM api_keys').run();

    const insert = db.prepare(`
      INSERT INTO api_keys (name, api_key, base_url, model, priority, is_active, daily_limit, daily_used)
      VALUES (?, ?, ?, ?, ?, 1, 500, 0)
    `);

    records.forEach((record) => {
      insert.run(
        record.name,
        record.api_key,
        record.base_url,
        record.model,
        record.priority
      );
    });
  });

  replaceKeys(envKeys);
  console.log(`Synchronized ${envKeys.length} API key(s) from environment variables.`);
}
