import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './db';
import { syncApiKeysFromEnv } from './api-keys';
import { seedAppSettings } from './settings';

dotenv.config({ path: path.join(process.cwd(), '.env') });

function main() {
  console.log('Initializing star-wiki database...');

  initDatabase();
  seedAppSettings();
  syncApiKeysFromEnv();

  console.log('Database initialization completed.');
  process.exit(0);
}

main();
