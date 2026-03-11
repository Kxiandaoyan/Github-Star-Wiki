# 🚀 深度优化方案 - 学习 openDeepWiki

## ❌ 当前问题

### 1. 只看 README
```typescript
// 当前的 analyzeRepo() 方法
const analysis = await this.analyzeRepo(repoPath);
// 只读取 README ❌
// 只获取目录结构 ❌
```

**问题**：
- ❌ 很多项目没有详细的 README
- ❌ 无法了解实际代码实现
- ❌ 无法提取 API、架构等关键信息
- ❌ 生成的内容太泛泛而谈

## ✅ openDeepWiki 的核心思路

### 1. 多工具协作
```go
// openDeepWiki 使用的工具
- list_dir       // 列出目录
- read_file      // 读取文件（支持行数限制）
- search_files   // 搜索代码
- run_terminal_command  // 执行命令
```

### 2. 严格基于事实
```yaml
# 严禁编造代码示例
- 所有代码示例必须从仓库的实际源文件中提取
- 不得发明、生成或假设任何不存在的代码
- 每个代码块必须标注来源
```

### 3. 智能分析流程
```yaml
1. 仓库结构浏览
   - list_dir 获取顶层结构
   - 识别核心目录

2. 文件定位
   - search_files 查找相关文件
   - read_file 读取实际内容

3. 交叉验证
   - 验证接口与实现
   - 验证配置与代码
```

## 🎯 优化方案

### Phase 1: 深度代码分析

#### 1.1 项目类型识别
```typescript
interface ProjectAnalysis {
  type: 'frontend' | 'backend' | 'fullstack' | 'library' | 'cli';
  framework: string;  // React, Vue, Next.js, Django, FastAPI...
  language: string;   // TypeScript, JavaScript, Python, Go...

  // 关键文件
  entryFile: string;        // 入口文件
  configFile: string;       // 配置文件
  packageFile: string;      // package.json / requirements.txt

  // 目录结构
  sourceDir: string;        // 源代码目录
  testDir: string;          // 测试目录
  docsDir: string;          // 文档目录
}
```

#### 1.2 关键信息提取
```typescript
interface KeyInfo {
  // 依赖信息
  dependencies: {
    name: string;
    version: string;
    type: 'production' | 'development';
  }[];

  // 脚本命令
  scripts: {
    name: string;
    command: string;
  }[];

  // API 路由（如果适用）
  apiRoutes: {
    method: string;
    path: string;
    file: string;
  }[];

  // 核心模块
  coreModules: {
    name: string;
    path: string;
    type: string;
  }[];
}
```

### Phase 2: 智能内容生成

#### 2.1 分类型生成策略

**前端项目**（React/Vue/Next.js）：
```
1. 项目概述
   - 技术栈（基于 package.json）
   - 核心功能（基于路由和组件）

2. 快速开始
   - 安装依赖（基于 package.json）
   - 启动命令（基于 scripts）
   - 环境配置（基于配置文件）

3. 核心功能
   - 页面路由（基于 pages/ 或 app/ 目录）
   - 主要组件（基于 components/ 目录）
   - 状态管理（基于 stores/ 或 context/）

4. 项目结构
   - 目录说明（基于实际结构）
   - 关键文件（基于代码分析）
```

**后端项目**（Django/FastAPI/Express）：
```
1. 项目概述
   - 技术栈
   - 核心功能

2. API 文档
   - 路由列表（基于路由文件）
   - 接口说明（基于代码注释）
   - 请求/响应示例（基于实际代码）

3. 数据模型
   - 数据库表（基于 models/）
   - 字段说明（基于代码）
   - 关系图（Mermaid ER 图）

4. 部署说明
   - 环境要求
   - 配置项
   - 启动命令
```

**库/工具**：
```
1. 项目概述
   - 用途
   - 特性

2. 安装
   - npm / pip / go get

3. 使用示例
   - 基于实际代码提取
   - 标注来源文件

4. API 文档
   - 函数签名（基于代码）
   - 参数说明
   - 返回值
```

#### 2.2 代码示例提取

```typescript
// 不要编造示例 ❌
const example = `
// 这可能不对
const app = new App();
`;

// 要从实际代码提取 ✅
const example = await extractCodeExample({
  file: 'src/app.ts',
  startLine: 10,
  endLine: 20,
  description: '应用初始化示例'
});

// 标注来源
> 来源: [src/app.ts](src/app.ts#L10-L20)
```

### Phase 3: 结构化输出

#### 3.1 增强 LLM Prompt

```typescript
const prompt = `
你是一个技术文档专家。请基于以下实际信息生成文档：

## 项目信息
- 名称: ${projectName}
- 类型: ${projectType}
- 框架: ${framework}
- 语言: ${language}

## 依赖（来自 package.json）
${dependencies}

## 关键文件
${keyFiles.map(f => `- ${f.path}: ${f.description}`).join('\n')}

## 源代码示例
${codeExamples}

## 要求
1. 所有代码示例必须标注来源文件和行号
2. 不要编造不存在的功能
3. 基于实际代码描述功能
4. 使用项目实际的技术栈名称

## 输出格式
生成 JSON，包含：
- oneLineIntro: 一句话介绍
- chineseIntro: 详细介绍
- wikiToc: Wiki 目录
- keyFeatures: 关键特性（基于代码）
- techStack: 技术栈（基于依赖）
`;
```

## 📊 预期效果对比

### 当前（只看 README）
```
项目: Next.js
介绍: "这是一个 React 框架"
问题: ❌ 太泛泛
      ❌ 没有实际内容
      ❌ 读者学不到东西
```

### 优化后（深度分析）
```
项目: Next.js
介绍: "Next.js 是一个基于 React 的全栈框架，提供混合静态和服务器渲染、
      TypeScript 支持、智能打包、路由预加载等功能。基于 package.json
      分析，该项目依赖 React 19、TypeScript 5.9、Tailwind CSS 4。"

Wiki 章节:
1. 项目概述
   - 技术栈（基于依赖分析）
   - 核心特性（基于代码）

2. 快速开始
   - 安装命令（来自 package.json scripts）
   - 实际示例（来自源代码）

3. 路由系统
   - 基于文件的路由（基于 app/ 目录分析）
   - 代码示例（来自实际路由文件）

4. API 路由
   - 路由列表（基于 api/ 目录）
   - 实际实现（基于代码）

优点: ✅ 内容详实
      ✅ 基于实际代码
      ✅ 有具体示例
      ✅ 有来源标注
```

## 🔧 实现优先级

### P0 - 必须实现
1. ✅ 读取 package.json / requirements.txt 等依赖文件
2. ✅ 识别项目类型和框架
3. ✅ 读取关键代码文件（入口、配置）
4. ✅ 基于实际代码生成内容

### P1 - 建议实现
1. ⏳ 提取 API 路由
2. ⏳ 分析目录结构
3. ⏳ 生成架构图（Mermaid）
4. ⏳ 代码示例标注来源

### P2 - 可选实现
1. ⏳ 多语言支持
2. ⏳ 代码片段高亮
3. ⏳ 交互式文档
4. ⏳ 版本对比

## 💡 关键改进点

### 1. 从"猜"到"读"
```typescript
// 之前 ❌
const intro = "这是一个 React 项目"; // 猜的

// 之后 ✅
const packageJson = await readPackageJson();
const intro = `基于 ${packageJson.dependencies.react} 的项目`;
```

### 2. 从"编"到"提取"
```typescript
// 之前 ❌
const example = "const app = createApp()"; // 编的

// 之后 ✅
const code = await readFile('src/index.ts', 10, 20);
const example = `${code}\n> 来源: src/index.ts#L10-L20`;
```

### 3. 从"泛"到"精"
```typescript
// 之前 ❌
"支持路由功能"

// 之后 ✅
"基于文件的路由系统，支持动态路由（app/[id]/page.tsx）、
 布局嵌套（app/layout.tsx）、加载状态（app/loading.tsx）"
```

## 🎯 下一步行动

### 立即可做的优化
1. **读取 package.json** - 提取依赖、脚本
2. **识别入口文件** - index.ts, main.go, app.py
3. **读取配置文件** - config.*, .env.example
4. **增强 Prompt** - 提供更多上下文

### 中期优化
1. **智能文件选择** - 根据项目类型读取关键文件
2. **代码片段提取** - 提取关键代码并标注来源
3. **API 提取** - 分析路由文件
4. **架构分析** - 生成目录树和依赖图

### 长期优化
1. **多 Agent 协作** - 像 openDeepWiki 一样
2. **工具系统** - read_file, search_files
3. **增量更新** - 只分析变更部分
4. **质量检查** - 验证生成内容的准确性

---

**核心理念：基于事实，而非猜测！**
