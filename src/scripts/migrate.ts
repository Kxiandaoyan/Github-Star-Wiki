#!/usr/bin/env tsx

/**
 * 数据迁移命令行工具
 * 用法：
 *   npm run migrate          # 执行完整迁移
 *   npm run migrate:validate # 验证迁移结果
 *   npm run migrate:rollback # 回滚到指定版本
 */

import { runFullMigration, validateMigration } from '../lib/data-migration';
import { getCurrentDbVersion, rollbackToVersion } from '../lib/db-migration';

const command = process.argv[2] || 'migrate';

async function main() {
  console.log('Star Wiki 数据迁移工具\n');

  switch (command) {
    case 'migrate':
    case 'run': {
      const currentVersion = getCurrentDbVersion();
      console.log(`当前数据库版本: ${currentVersion}\n`);

      const result = runFullMigration();

      if (result.success) {
        console.log('\n验证迁移结果...\n');
        validateMigration();
        console.log('\n✓ 迁移成功完成！');
        console.log('\n建议：');
        console.log('1. 备份当前数据库文件 data/star-wiki.db');
        console.log('2. 重启应用以使用新的分类体系');
        console.log('3. 在后台触发一次语义缓存回填（如果需要）');
      } else {
        console.error('\n✗ 迁移失败:', result.error);
        process.exit(1);
      }
      break;
    }

    case 'validate':
    case 'check': {
      validateMigration();
      break;
    }

    case 'rollback': {
      const targetVersion = Number.parseInt(process.argv[3] || '0', 10);
      const currentVersion = getCurrentDbVersion();

      console.log(`当前版本: ${currentVersion}`);
      console.log(`目标版本: ${targetVersion}\n`);

      if (targetVersion >= currentVersion) {
        console.error('✗ 目标版本必须小于当前版本');
        process.exit(1);
      }

      console.log('警告：回滚操作可能导致数据丢失！');
      console.log('请确保已备份数据库文件。\n');

      const result = rollbackToVersion(targetVersion);

      if (result.success) {
        console.log(`✓ ${result.message}`);
      } else {
        console.error(`✗ ${result.message}`, result.error);
        process.exit(1);
      }
      break;
    }

    case 'version': {
      const version = getCurrentDbVersion();
      console.log(`数据库版本: ${version}`);
      break;
    }

    case 'help':
    default: {
      console.log('用法:');
      console.log('  npm run migrate              执行完整迁移');
      console.log('  npm run migrate:validate     验证迁移结果');
      console.log('  npm run migrate:rollback N   回滚到版本 N');
      console.log('  npm run migrate:version      查看当前版本');
      console.log('');
      console.log('或直接使用 tsx:');
      console.log('  tsx src/scripts/migrate.ts [command]');
      break;
    }
  }
}

main().catch((error) => {
  console.error('执行失败:', error);
  process.exit(1);
});
