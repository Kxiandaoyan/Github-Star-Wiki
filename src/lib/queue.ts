import db from './db';
import { LLMClient } from './llm';
import { ErrorClassifier, ErrorType } from './error-handler';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface Task {
  id: number;
  project_id: number;
  task_type: 'generate_all' | 'wiki_doc';
  priority: number;
  status: string;
  retry_count: number;
  error_message: string | null;
}

export interface ApiKey {
  id: number;
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  priority: number;
  is_active: boolean;
  daily_limit: number;
  daily_used: number;
  last_used_at: string | null;
}

export class QueueProcessor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // 启动队列处理器
  start() {
    if (this.isRunning) {
      console.log('⚠️  队列处理器已在运行');
      return;
    }

    console.log('🚀 队列处理器启动（优化版：一次性生成所有内容）');
    this.isRunning = true;

    // 恢复中断的任务
    this.recoverInterruptedTasks();

    // 每 2 秒检查一次队列
    this.intervalId = setInterval(() => {
      this.processNextTask();
    }, 2000);
  }

  // 停止队列处理器
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 队列处理器停止');
  }

  // 恢复中断的任务
  private recoverInterruptedTasks() {
    const result = db.prepare(`
      UPDATE task_queue
      SET status = 'pending', retry_count = retry_count + 1
      WHERE status = 'processing'
    `).run();

    if (result.changes > 0) {
      console.log(`🔄 恢复了 ${result.changes} 个中断的任务`);
    }
  }

  // 获取下一个任务
  private getNextTask(): Task | null {
    return db.prepare(`
      SELECT * FROM task_queue
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `).get() as Task | null;
  }

  // 获取可用的 API Key
  private getAvailableApiKey(): ApiKey | null {
    const keys = db.prepare(`
      SELECT * FROM api_keys
      WHERE is_active = 1 AND daily_used < daily_limit
      ORDER BY priority ASC, daily_used ASC
      LIMIT 1
    `).all() as ApiKey[];

    return keys.length > 0 ? keys[0] : null;
  }

  // 更新 API Key 使用情况
  private updateApiKeyUsage(apiKeyId: number) {
    db.prepare(`
      UPDATE api_keys
      SET daily_used = daily_used + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(apiKeyId);
  }

  // 处理下一个任务
  private async processNextTask() {
    const task = this.getNextTask();

    if (!task) {
      return; // 没有待处理的任务
    }

    const apiKey = this.getAvailableApiKey();

    if (!apiKey) {
      console.log('⚠️  所有 API Key 已达日限制，暂停队列');
      return;
    }

    // 标记任务为处理中
    db.prepare(`
      UPDATE task_queue
      SET status = 'processing', started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(task.id);

    console.log(`📋 开始处理任务 #${task.id}: ${task.task_type} (项目 ID: ${task.project_id})`);

    try {
      // 根据任务类型处理
      await this.processTask(task, apiKey);

      // 标记任务完成
      db.prepare(`
        UPDATE task_queue
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(task.id);

      console.log(`✅ 任务 #${task.id} 完成`);

    } catch (error: any) {
      console.error(`❌ 任务 #${task.id} 失败:`, error.message);
      this.handleTaskFailure(task, error);
    }
  }

  // 处理任务
  private async processTask(task: Task, apiKey: ApiKey) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any;

    if (!project) {
      throw new Error('项目不存在');
    }

    // 创建 LLM 客户端
    const llmClient = new LLMClient({
      apiKey: apiKey.api_key,
      baseUrl: apiKey.base_url,
      model: apiKey.model,
    });

    switch (task.task_type) {
      case 'generate_all':
        await this.generateAllContent(project, llmClient);
        break;
      case 'wiki_doc':
        // Wiki 章节生成（如果需要单独处理）
        await this.generateWikiChapter(project, llmClient);
        break;
      default:
        throw new Error(`未知任务类型: ${task.task_type}`);
    }

    // 更新 API Key 使用情况
    this.updateApiKeyUsage(apiKey.id);
  }

  // 🎯 一次性生成所有内容（优化版）
  private async generateAllContent(project: any, llmClient: LLMClient) {
    console.log(`📥 开始处理项目: ${project.full_name}`);

    // 克隆仓库（只克隆一次）
    const repoPath = await this.cloneRepo(project.full_name);

    try {
      // 分析仓库（只读取一次）
      console.log(`🔍 分析仓库结构...`);
      const analysis = await this.analyzeRepo(repoPath);

      // 🎯 一次性调用 LLM 生成所有内容
      console.log(`🤖 调用 LLM 生成所有内容...`);
      const { oneLineIntro, chineseIntro, wikiDocuments } = await llmClient.generateAllContent(
        project.full_name,
        project.description,
        analysis.readme,
        analysis.structure
      );

      console.log(`✍️  生成完成: 一句话(${oneLineIntro.length}字), 介绍(${chineseIntro.length}字), Wiki(${wikiDocuments.length}章节)`);

      // 更新项目
      db.prepare(`
        UPDATE projects
        SET
          one_line_intro = ?,
          one_line_status = 'completed',
          chinese_intro = ?,
          intro_status = 'completed',
          wiki_status = 'generating'
        WHERE id = ?
      `).run(oneLineIntro, chineseIntro, project.id);

      // 创建 Wiki 章节任务（如果需要）
      if (wikiDocuments && wikiDocuments.length > 0) {
        const createWikiDoc = db.prepare(`
          INSERT INTO wiki_documents (project_id, title, content, sort_order)
          VALUES (?, ?, ?, ?)
        `);

        // 插入 Wiki 章节标题（内容留空，可以后续单独生成）
        wikiDocuments.forEach((chapter: any, index: number) => {
          createWikiDoc.run(project.id, chapter.title, chapter.content, index + 1);
        });

        // 暂时直接标记 Wiki 完成
        db.prepare(`
          UPDATE projects
          SET wiki_status = 'completed'
          WHERE id = ?
        `).run(project.id);
      } else {
        // 没有 Wiki TOC，直接标记完成
        db.prepare(`
          UPDATE projects
          SET wiki_status = 'completed'
          WHERE id = ?
        `).run(project.id);
      }

      console.log(`✅ 项目 ${project.full_name} 所有内容生成完成`);

    } finally {
      // 删除临时仓库
      this.deleteRepo(repoPath);
    }
  }

  // Wiki 章节详细生成（如果需要）
  private async generateWikiChapter(project: any, llmClient: LLMClient) {
    // 这个功能暂时不需要，因为已经在 generateAllContent 中一次性生成了
    throw new Error('Wiki 章节单独生成功能未实现，请使用 generate_all 任务');
  }

  // 克隆仓库
  private async cloneRepo(fullName: string): Promise<string> {
    const clonePath = path.join(process.cwd(), 'data', 'repos', fullName.replace('/', '_'));

    // 如果已存在，先删除
    if (fs.existsSync(clonePath)) {
      fs.rmSync(clonePath, { recursive: true, force: true });
    }

    return new Promise((resolve, reject) => {
      const git = spawn('git', [
        'clone',
        '--depth', '1',
        `https://github.com/${fullName}.git`,
        clonePath
      ]);

      git.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ 克隆仓库成功: ${fullName}`);
          resolve(clonePath);
        } else {
          reject(new Error(`克隆仓库失败: ${fullName}`));
        }
      });

      git.on('error', (err) => {
        reject(err);
      });
    });
  }

  // 删除仓库
  private deleteRepo(repoPath: string) {
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
      console.log(`🗑️  删除临时仓库: ${repoPath}`);
    }
  }

  // 分析仓库（深度版本 - 学习 openDeepWiki）
  private async analyzeRepo(repoPath: string): Promise<{
    readme: string;
    structure: string;
  }> {
    console.log(`🔍 开始深度分析仓库...`);

    // 1. 读取 README
    let readme = '';
    const readmeFiles = ['README.md', 'README.rst', 'README.txt', 'readme.md', 'README'];

    for (const file of readmeFiles) {
      const filePath = path.join(repoPath, file);
      if (fs.existsSync(filePath)) {
        readme = fs.readFileSync(filePath, 'utf-8');
        console.log(`📖 找到 README: ${file} (${readme.length} 字符)`);
        break;
      }
    }

    if (!readme) {
      console.log(`⚠️  未找到 README 文件`);
    }

    // 2. 深度分析：读取 package.json / requirements.txt 等配置文件
    const additionalInfo: string[] = [];

    // package.json (Node.js 项目)
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        additionalInfo.push(`\n### package.json 信息:
- 名称: ${packageJson.name || '未知'}
- 版本: ${packageJson.version || '未知'}
- 类型: ${packageJson.type || 'commonjs'}

**生产依赖**:
${Object.entries(packageJson.dependencies || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**开发依赖**:
${Object.entries(packageJson.devDependencies || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**脚本命令**:
${Object.entries(packageJson.scripts || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`);

        console.log(`📦 解析了 package.json`);
      } catch (error) {
        console.log(`⚠️  package.json 解析失败`);
      }
    }

    // requirements.txt (Python 项目)
    const requirementsPath = path.join(repoPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      const requirements = fs.readFileSync(requirementsPath, 'utf-8');
      additionalInfo.push(`\n### Python 依赖:\n${requirements}`);
      console.log(`🐍 找到 requirements.txt`);
    }

    // go.mod (Go 项目)
    const goModPath = path.join(repoPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      const goMod = fs.readFileSync(goModPath, 'utf-8');
      additionalInfo.push(`\n### go.mod:\n${goMod.split('\n').slice(0, 20).join('\n')}`);
      console.log(`🐹 找到 go.mod`);
    }

    // 3. 读取主文件（入口文件）
    const mainFiles = [
      'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
      'index.ts', 'index.js', 'main.ts', 'main.js',
      'app/main.go', 'cmd/main.go', 'main.go',
      'app.py', 'main.py', '__init__.py',
    ];

    for (const mainFile of mainFiles) {
      const mainPath = path.join(repoPath, mainFile);
      if (fs.existsSync(mainPath)) {
        const content = this.readFileLines(mainPath, 30);
        if (content) {
          additionalInfo.push(`\n### 入口文件 (${mainFile}):\n\`\`\`\n${content}\n\`\`\``);
          console.log(`🚪 找到入口文件: ${mainFile}`);
          break;
        }
      }
    }

    // 4. 读取配置文件
    const configFiles = [
      'tsconfig.json', 'vite.config.ts', 'next.config.js', 'nuxt.config.js',
      'vue.config.js', 'tailwind.config.js', '.env.example',
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(repoPath, configFile);
      if (fs.existsSync(configPath)) {
        const content = this.readFileLines(configPath, 20);
        if (content) {
          additionalInfo.push(`\n### 配置文件 (${configFile}):\n\`\`\`\n${content}\n\`\`\``);
          console.log(`⚙️  找到配置文件: ${configFile}`);
          break; // 只读一个配置文件
        }
      }
    }

    // 5. 获取目录结构
    const structure = await this.getDirectoryStructure(repoPath, '', 3);
    console.log(`📁 目录结构分析完成`);

    // 6. 合并所有信息
    const fullAnalysis = readme + additionalInfo.join('\n') + `\n\n### 目录结构:\n${structure}`;

    return {
      readme: fullAnalysis,
      structure,
    };
  }

  // 读取文件指定行数（辅助方法）
  private readFileLines(filePath: string, maxLines: number): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, maxLines);
      return lines.join('\n');
    } catch (error) {
      return '';
    }
  }

  // 获取目录结构
  private async getDirectoryStructure(
    dirPath: string,
    prefix: string,
    maxDepth: number
  ): Promise<string> {
    if (maxDepth === 0) return '';

    const items = fs.readdirSync(dirPath);
    let result = '';

    // 过滤掉不需要的目录
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'vendor', 'target', 'bin', 'obj'];

    for (const item of items) {
      if (ignoreDirs.includes(item)) continue;
      if (item.startsWith('.')) continue; // 跳过隐藏文件

      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        result += `${prefix}${item}/\n`;
        result += await this.getDirectoryStructure(
          itemPath,
          prefix + '  ',
          maxDepth - 1
        );
      } else {
        result += `${prefix}${item}\n`;
      }
    }

    return result;
  }

  // 处理任务失败（智能错误处理）
  private async handleTaskFailure(task: Task, error: Error) {
    const errorType = ErrorClassifier.classify(error);
    const strategy = ErrorClassifier.getStrategy(errorType);

    console.error(`❌ 任务 #${task.id} 失败 [${errorType}]: ${error.message}`);
    console.log(`📋 错误策略: ${JSON.stringify(strategy)}`);

    // 如果需要跳过项目
    if (strategy.skipProject) {
      console.log(`⏭️  跳过项目，不再重试`);
      db.prepare(`
        UPDATE task_queue
        SET status = 'skipped', error_message = ?
        WHERE id = ?
      `).run(`[${errorType}] ${error.message}`, task.id);
      return;
    }

    // 如果不需要重试
    if (!strategy.shouldRetry) {
      console.log(`🚫 不重试，标记为失败`);
      db.prepare(`
        UPDATE task_queue
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).run(`[${errorType}] ${error.message}`, task.id);
      return;
    }

    // 检查重试次数
    const maxRetries = strategy.maxRetries || 3;
    if (task.retry_count >= maxRetries) {
      console.log(`❌ 达到最大重试次数 ${maxRetries}，最终失败`);
      db.prepare(`
        UPDATE task_queue
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).run(`[${errorType}] ${error.message} (重试 ${task.retry_count} 次)`, task.id);
      return;
    }

    // 切换 API Key（如果需要）
    if (strategy.switchApiKey) {
      console.log(`🔄 切换到下一个 API Key`);
      // 标记当前 Key 为无效
      const currentKey = this.getAvailableApiKey();
      if (currentKey) {
        db.prepare(`
          UPDATE api_keys
          SET is_active = 0
          WHERE id = ?
        `).run(currentKey.id);
      }
    }

    // 延迟重试
    if (strategy.delay && strategy.delay > 0) {
      console.log(`⏰ 等待 ${strategy.delay / 1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, strategy.delay));
    }

    // 更新任务状态
    const newPriority = task.priority + (strategy.priorityAdjust || 0);
    db.prepare(`
      UPDATE task_queue
      SET status = 'pending',
          retry_count = retry_count + 1,
          priority = ?,
          error_message = ?
      WHERE id = ?
    `).run(newPriority, `[${errorType}] ${error.message}`, task.id);

    console.log(`🔄 任务 #${task.id} 将重试 (第 ${task.retry_count + 1} 次，优先级: ${newPriority})`);
  }
}

// 单例模式
let processorInstance: QueueProcessor | null = null;

export function getQueueProcessor(): QueueProcessor {
  if (!processorInstance) {
    processorInstance = new QueueProcessor();
  }
  return processorInstance;
}
