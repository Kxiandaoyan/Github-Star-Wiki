# 🚀 Star Wiki 快速启动指南

## 📋 前提条件

1. **Node.js 18+** 已安装
2. **Git** 已安装
3. **GLM-4 API Key** ([获取地址](https://open.bigmodel.cn/))
4. **GitHub Token** (可选，但推荐，提高 API 限制)

## ⚡ 5 步快速启动

### 步骤 1: 配置环境变量

编辑 `D:/Code/star-wiki/.env` 文件：

\`\`\`bash
# 必填
GITHUB_USERNAME=你的GitHub用户名
GLM_API_KEYS=你的GLM-4-API-Key

# 推荐
GITHUB_TOKEN=ghp_你的GitHub-Token

# 可选（使用默认值即可）
GLM_BASE_URL=https://open.bigmodel.cn/api/anthropic
GLM_MODEL=glm-4
SYNC_INTERVAL_MINUTES=10
\`\`\`

### 步骤 2: 初始化数据库

\`\`\`bash
cd D:/Code/star-wiki
npm run init-db
\`\`\`

预期输出：
\`\`\`
🚀 初始化 star-wiki 数据库...
✅ 数据库初始化完成
✅ 已初始化 3 个 API Keys
✨ 初始化完成！
\`\`\`

### 步骤 3: 启动开发服务器

\`\`\`bash
npm run dev
\`\`\`

预期输出：
\`\`\`
✓ Ready in 2.5s
○ Local:   http://localhost:3000
\`\`\`

### 步骤 4: 触发首次同步

**方法 A: 使用浏览器**
1. 访问 http://localhost:3000
2. 打开浏览器开发者工具 (F12)
3. 在控制台输入并执行：
\`\`\`javascript
fetch('/api/sync', { method: 'POST' }).then(r => r.json()).then(console.log)
\`\`\`

**方法 B: 使用 curl**
\`\`\`bash
curl -X POST http://localhost:3000/api/sync
\`\`\`

**方法 C: 使用 Postman**
- URL: `http://localhost:3000/api/sync`
- Method: `POST`
- 点击 Send

预期输出：
\`\`\`json
{
  "success": true,
  "total": 156,
  "new": 156,
  "updated": 0
}
\`\`\`

### 步骤 5: 查看效果

1. **首页** - http://localhost:3000
   - 查看项目列表
   - 使用搜索框搜索
   - 使用语言筛选

2. **详情页** - 点击任意项目卡片
   - 查看基本信息
   - 查看中文介绍（生成中）
   - 查看 Wiki 文档（生成中）

3. **队列状态** - 查看终端输出
   - 看到类似：`📋 开始处理任务 #1: one_line (优先级 1)`
   - 看到类似：`✅ 任务 #1 完成`

## 🔍 验证功能

### 1. 搜索功能
- 在首页搜索框输入关键词（如 "react"）
- 观察搜索结果

### 2. 语言筛选
- 点击语言标签（如 "JavaScript"）
- 观察筛选结果

### 3. 任务处理
- 打开 http://localhost:3000/api/queue/status (如果实现了)
- 或查看终端日志

### 4. 详情页
- 点击任意项目
- 观察生成状态（待生成/生成中/已完成）

## ⚠️ 常见问题

### 问题 1: GLM API 调用失败
**原因**: API Key 无效或余额不足
**解决**: 检查 API Key 是否正确，确认账户余额

### 问题 2: GitHub API 限制
**原因**: 未配置 Token，每小时只有 60 次请求
**解决**: 配置 GitHub Token

### 问题 3: 数据库错误
**原因**: 数据库未初始化
**解决**: 运行 `npm run init-db`

### 问题 4: 仓库克隆失败
**原因**: Git 未安装或网络问题
**解决**: 确保安装了 Git，检查网络连接

### 问题 5: 生成速度慢
**原因**: LLM API 调用和仓库克隆需要时间
**解决**: 这是正常的，几百个项目可能需要 1-2 小时

## 📊 性能指标

- **首次同步**: 取决于 star 数量，通常 1-5 分钟
- **一句话介绍生成**: 每个项目约 10-20 秒
- **详细中文介绍**: 每个项目约 15-30 秒
- **Wiki 生成**: 每个项目约 2-5 分钟

## 🎯 下一步

1. **配置定时同步**: 队列处理器已自动启动，每 10 分钟自动同步
2. **监控进度**: 查看终端日志了解生成进度
3. **自定义配置**: 编辑 `.env` 文件调整参数
4. **部署上线**: 参考 README.md 的部署章节

## 💡 提示

- **首次运行最慢**: 因为需要生成所有项目的内容
- **后续很快**: 只处理新增的 star 项目
- **可以随时刷新**: 前端会实时显示生成状态
- **API Key 轮换**: 配置多个 key 可以加快速度

## 🎉 开始使用

按照以上步骤操作，你将拥有一个智能的 GitHub Star 项目展示平台！

祝使用愉快！ ⭐
