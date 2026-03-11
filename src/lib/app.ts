import cron, { ScheduledTask } from 'node-cron';
import { syncStarredRepos } from './github';
import { ConcurrentQueueProcessor } from './queue-concurrent';
import { syncApiKeysFromEnv } from './api-keys';
import { initDatabase, rebuildProjectsSearchIndex } from './db';

let cronJob: ScheduledTask | null = null;
let processor: ConcurrentQueueProcessor | null = null;

function getSyncSchedule(intervalMinutes: number) {
  const normalizedInterval = Number.isFinite(intervalMinutes) ? Math.max(1, intervalMinutes) : 60;

  if (normalizedInterval >= 60 && normalizedInterval % 60 === 0) {
    const hours = Math.max(1, normalizedInterval / 60);
    return {
      expression: `0 */${hours} * * *`,
      label: `${hours} hour(s)`,
    };
  }

  return {
    expression: `*/${normalizedInterval} * * * *`,
    label: `${normalizedInterval} minute(s)`,
  };
}

export function initApp() {
  console.log('Initializing star-wiki application...');

  initDatabase();
  rebuildProjectsSearchIndex();
  syncApiKeysFromEnv();

  const concurrency = parseInt(process.env.TASK_CONCURRENCY || '3', 10);
  processor = new ConcurrentQueueProcessor(concurrency);
  processor.start();

  const intervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || '60', 10);
  const schedule = getSyncSchedule(intervalMinutes);

  cronJob = cron.schedule(schedule.expression, async () => {
    console.log('Running scheduled GitHub sync job...');
    try {
      await syncStarredRepos();
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  });

  console.log(`Scheduled sync started. Interval: ${schedule.label}.`);
}

export function cleanup() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('Scheduled sync stopped.');
  }

  if (processor) {
    processor.stop();
    processor = null;
  }
}
