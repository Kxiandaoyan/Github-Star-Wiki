# Star Wiki

Star Wiki 是一个把你的 GitHub Star 列表整理成“可搜索项目库”的网站。

很多人 Star 了很多仓库，但过一段时间以后，往往只记得“我好像收藏过一个这个方向的项目”，却很难再快速找回来。这个项目就是为了解决这个问题：

- 把你 Star 过的项目同步下来
- 自动生成中文简介
- 自动生成结构化 Wiki 卡片
- 支持搜索、筛选、回看

它更像是一个“面向自己收藏项目的检索与整理工具”，而不只是一个简单的 Star 列表页面。

## 这个项目能做什么

Star Wiki 会围绕你的 GitHub Star 列表做三件事：

1. 帮你收集

它会从 GitHub 拉取你 Star 过的仓库信息，包括仓库名、描述、语言、标签、Star 时间等。

2. 帮你整理

它会结合 README、仓库结构和关键信息，为每个项目生成：

- 一句话简介
- 中文项目介绍
- 多段 Wiki 内容

3. 帮你查找

你可以像查自己的资料库一样，按关键词、语言、中文介绍、标签去搜索项目，而不是再去翻 GitHub 的原始 Star 列表。

## 适合谁用

这个项目尤其适合下面几类用户：

- 经常收藏开源项目，但过阵子就忘了为什么收藏的人
- 想把 GitHub Star 列表整理成“自己的项目知识库”的人
- 希望用中文搜索和回看项目的人
- 想做一个有展示感的个人技术收藏网站的人

## 主要功能

- GitHub Star 同步
- 中文搜索
- 语言筛选
- 一句话项目简介
- 中文详细介绍
- Wiki 卡片生成
- Star 活动时间网格
- 项目详情页
- 定时同步
- 队列并发处理

## 页面大概是什么样

首页重点放在两件事上：

- 搜索
- 项目卡片浏览

你可以先搜，再快速判断一个项目是不是你当初想找的那个。点进项目后，可以继续看：

- 原始仓库信息
- 中文简介
- Wiki 分段内容
- 快速链接

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- SQLite
- better-sqlite3
- node-cron
- GLM / Anthropic 兼容接口

## 运行原理

整体流程大致是这样：

1. 读取你的 GitHub Star 列表
2. 把项目基础信息写入本地数据库
3. 进入后台任务队列
4. 拉取仓库 README、目录结构和关键文件信息
5. 调用大模型生成中文简介和 Wiki 内容
6. 首页和项目页展示整理后的结果

也就是说，Star Wiki 不是单纯地“展示 GitHub 返回的数据”，而是在此基础上做了二次整理和中文化。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

然后填写你自己的配置。

常用配置包括：

```bash
# GitHub
GITHUB_USERNAME=your_github_username
GITHUB_TOKEN=your_github_token

# LLM
GLM_API_KEYS=key1,key2
GLM_BASE_URL=https://open.bigmodel.cn/api/anthropic
GLM_MODEL=glm-4

# Sync
SYNC_INTERVAL_MINUTES=60

# Queue
TASK_CONCURRENCY=2
```

### 3. 启动开发环境

```bash
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

### 4. 首次同步数据

第一次启动后，需要主动触发一次同步，这样系统才会开始抓取你的 Star 项目并生成内容。

可以直接请求：

```bash
curl -X POST http://localhost:3000/api/sync
```

或者你也可以用浏览器、Postman、Hoppscotch 等工具发送一个 `POST` 请求到：

```text
/api/sync
```

## 首次使用时会发生什么

第一次同步通常会经历下面几个阶段：

1. 拉取 GitHub Star 列表
2. 为新项目创建处理任务
3. 后台队列逐个分析仓库内容
4. 生成中文简介和 Wiki
5. 首页逐渐显示完整项目卡片

如果你 Star 的项目很多，第一次处理会花一些时间，这是正常的。后续再同步时，只会继续处理新的项目或需要补充的内容。

## 搜索支持哪些内容

当前搜索不仅会搜仓库原始信息，还会搜生成后的中文内容。

支持匹配的字段包括：

- 仓库全名
- 仓库名
- 原始描述
- 中文简介
- 一句话简介
- topics 标签

这意味着你可以直接用中文搜索，比如按“工作流”“代理”“浏览器插件”这类概念去找项目。

## 定时同步

项目启动后会按设定的时间间隔自动同步 GitHub Star 列表。

默认是：

```bash
SYNC_INTERVAL_MINUTES=60
```

也就是每 1 小时检查一次。

## 环境变量说明

### GitHub

- `GITHUB_USERNAME`
  你的 GitHub 用户名

- `GITHUB_TOKEN`
  推荐填写。没有 Token 也能运行，但 GitHub API 限额更低。

### 大模型

- `GLM_API_KEYS`
  一个或多个 API Key，多个 Key 用英文逗号分隔

- `GLM_BASE_URL`
  模型接口地址，当前使用 Anthropic 兼容格式

- `GLM_MODEL`
  模型名

### 同步与队列

- `SYNC_INTERVAL_MINUTES`
  定时同步间隔，单位是分钟

- `TASK_CONCURRENCY`
  后台并发处理数

- `MAX_RETRY_COUNT`
  失败后的最大重试次数

## 项目结构

```text
src/
  app/
    api/                 API 路由
    projects/            项目详情页
    page.tsx             首页
  components/            页面组件
  lib/
    app.ts               应用初始化
    db.ts                数据库初始化
    github.ts            GitHub 同步与仓库分析
    llm.ts               大模型调用
    queue-concurrent.ts  并发任务队列
```

## 部署说明

你可以把它部署到支持 Node.js 的环境，比如：

- Railway
- VPS
- 自己的服务器
- 支持持久化存储的容器平台

### 生产环境启动

```bash
npm run build
npm run start
```

### 推荐部署流程

1. 配置环境变量
2. 启动应用
3. 首次触发 `/api/sync`
4. 等待队列生成首页内容

## 常见问题

### 为什么刚启动时页面里项目内容不完整？

因为项目同步后，还需要后台队列去分析仓库并生成中文内容。首次运行时，内容会逐步补全。

### 为什么搜索结果会越来越准？

因为搜索不仅依赖 GitHub 原始描述，也依赖后续生成的中文简介和 Wiki 内容。随着数据补齐，可搜索的信息会更丰富。

### 这个项目更偏“展示”还是“工具”？

两者都有，但本质上更偏“工具”。它的核心价值不是单纯好看，而是帮你重新找到和理解自己收藏过的项目。

## License

MIT
