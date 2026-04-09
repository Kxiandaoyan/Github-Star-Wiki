import axios, { AxiosError } from 'axios';
import db from './db';
import { RepositoryRef, RepositoryScanResult } from './project-analysis';
import { getNumberSetting, getSettingValue } from './settings';
import { enqueueGenerateTask } from './task-queue';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  default_branch?: string;
}

interface StarredRepoResponse {
  starred_at: string;
  repo: GitHubRepo;
}

interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
}

interface GitBranchResponse {
  name: string;
  commit: {
    sha: string;
  };
}

interface GitCommitResponse {
  sha: string;
  tree: {
    sha: string;
  };
}

interface ProjectRecord {
  id: number;
  github_id: number;
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  mind_map: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq_json: string | null;
  project_type: string | null;
  html_url: string;
  stars: number;
  language: string | null;
  topics: string | null;
  fork: number;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  starred_at: string | null;
  synced_at: string | null;
  one_line_status: string;
  intro_status: string;
  wiki_status: string;
  current_task_type: string | null;
  current_task_status: string | null;
}

interface LanguageCount {
  language: string;
  count: number;
}

interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  company: string | null;
  location: string | null;
  blog: string | null;
}

interface SyncResult {
  total: number;
  new: number;
  updated: number;
  queued: number;
  alreadyQueued: number;
  alreadyGenerated: number;
}

let syncInFlight: Promise<SyncResult> | null = null;

function getGitHubConfig() {
  return {
    username: getSettingValue('GITHUB_USERNAME'),
    token: getSettingValue('GITHUB_TOKEN'),
  };
}

function createGithubApi(acceptHeader = 'application/vnd.github+json') {
  const { token } = getGitHubConfig();

  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Accept: acceptHeader,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 30000,
  });
}

function getGitHubErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiMessage = typeof error.response?.data === 'object'
      ? (error.response?.data as { message?: string }).message
      : undefined;

    if (status && apiMessage) {
      return `${fallback}: GitHub API ${status} ${apiMessage}`;
    }

    if (status) {
      return `${fallback}: GitHub API ${status}`;
    }

    if (error.message) {
      return `${fallback}: ${error.message}`;
    }
  }

  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}

async function getRepositoryMetadata(fullName: string): Promise<GitHubRepo> {
  try {
    const githubApi = createGithubApi();
    const response = await githubApi.get<GitHubRepo>(`/repos/${fullName}`);
    return response.data;
  } catch (error) {
    throw new Error(getGitHubErrorMessage(error, `Failed to load repository metadata for ${fullName}`));
  }
}

export async function fetchGitHubProfile() {
  const { username: githubUsername, token: githubToken } = getGitHubConfig();
  const fallbackLogin = githubUsername || null;

  if (!githubToken && !githubUsername) {
    return null;
  }

  try {
    const githubApi = createGithubApi();
    const endpoint = githubToken ? '/user' : `/users/${githubUsername}`;
    const response = await githubApi.get<GitHubUserProfile>(endpoint);
    return response.data;
  } catch (error) {
    console.error(getGitHubErrorMessage(error, `Failed to load GitHub profile for ${fallbackLogin || 'user'}`));
    return null;
  }
}

async function getReadmeContent(fullName: string, ref?: string): Promise<string> {
  try {
    const githubApi = createGithubApi();
    const response = await githubApi.get<string>(`/repos/${fullName}/readme`, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
      },
      params: ref ? { ref } : undefined,
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    return typeof response.data === 'string' ? response.data : '';
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 404) {
      return '';
    }

    throw new Error(getGitHubErrorMessage(error, `Failed to load README for ${fullName}`));
  }
}

async function getFileContent(fullName: string, filePath: string, ref?: string): Promise<string> {
  try {
    const githubApi = createGithubApi();
    const response = await githubApi.get<string>(`/repos/${fullName}/contents/${filePath}`, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
      },
      params: ref ? { ref } : undefined,
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    return typeof response.data === 'string' ? response.data : '';
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 404) {
      return '';
    }

    throw new Error(getGitHubErrorMessage(error, `Failed to load file ${filePath} for ${fullName}`));
  }
}

function buildDirectoryStructure(tree: TreeItem[], maxDepth = 4) {
  const ignoreRoots = new Set([
    '.git',
    '.github',
    '.next',
    '__pycache__',
    'bin',
    'build',
    'coverage',
    'dist',
    'node_modules',
    'obj',
    'target',
    'vendor',
  ]);

  return tree
    .filter((item) => {
      const segments = item.path.split('/');
      return segments.length <= maxDepth
        && !segments.some((segment) => ignoreRoots.has(segment))
        && !segments.some((segment) => segment.startsWith('.') && segment !== '.env.example');
    })
    .sort((left, right) => left.path.localeCompare(right.path))
    .slice(0, 220)
    .map((item) => `${'  '.repeat(item.path.split('/').length - 1)}${item.path.split('/').at(-1)}${item.type === 'tree' ? '/' : ''}`)
    .join('\n');
}

async function getRepositoryRef(fullName: string, defaultBranch: string): Promise<RepositoryRef | null> {
  try {
    const githubApi = createGithubApi();
    const branchResponse = await githubApi.get<GitBranchResponse>(
      `/repos/${fullName}/branches/${encodeURIComponent(defaultBranch)}`
    );
    const commitSha = branchResponse.data.commit.sha;
    const commitResponse = await githubApi.get<GitCommitResponse>(`/repos/${fullName}/git/commits/${commitSha}`);

    return {
      defaultBranch,
      commitSha,
      treeSha: commitResponse.data.tree.sha,
    };
  } catch (error) {
    console.warn(getGitHubErrorMessage(error, `Failed to resolve pinned repository ref for ${fullName}`));
    return null;
  }
}

async function getRepositoryTree(fullName: string, ref: string) {
  try {
    const githubApi = createGithubApi();
    const response = await githubApi.get<{ tree: TreeItem[]; truncated: boolean }>(
      `/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`
    );

    return response.data;
  } catch (error) {
    throw new Error(getGitHubErrorMessage(error, `Failed to load repository tree for ${fullName}`));
  }
}

function formatPackageFacts(packageJson: string) {
  try {
    const parsed = JSON.parse(packageJson) as {
      name?: string;
      packageManager?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const scripts = Object.entries(parsed.scripts || {})
      .slice(0, 8)
      .map(([name, command]) => `- ${name}: ${command}`)
      .join('\n');

    const deps = Object.entries(parsed.dependencies || {})
      .slice(0, 12)
      .map(([name, version]) => `- ${name}: ${version}`)
      .join('\n');

    const devDeps = Object.entries(parsed.devDependencies || {})
      .slice(0, 10)
      .map(([name, version]) => `- ${name}: ${version}`)
      .join('\n');

    return [
      '## package.json',
      parsed.name ? `name: ${parsed.name}` : '',
      parsed.packageManager ? `packageManager: ${parsed.packageManager}` : '',
      scripts ? `scripts:\n${scripts}` : '',
      deps ? `dependencies:\n${deps}` : '',
      devDeps ? `devDependencies:\n${devDeps}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}

function scoreCandidateFile(path: string) {
  const normalized = path.toLowerCase();

  const exactMatches = new Map<string, number>([
    ['package.json', 100],
    ['requirements.txt', 100],
    ['pyproject.toml', 100],
    ['go.mod', 100],
    ['cargo.toml', 100],
    ['composer.json', 100],
    ['pom.xml', 100],
    ['build.gradle', 95],
    ['build.gradle.kts', 95],
    ['next.config.ts', 95],
    ['next.config.js', 95],
    ['next.config.mjs', 95],
    ['vite.config.ts', 92],
    ['vite.config.js', 92],
    ['tsconfig.json', 90],
    ['.env.example', 88],
    ['app/page.tsx', 90],
    ['app/layout.tsx', 86],
    ['main.py', 90],
    ['app.py', 90],
    ['main.go', 90],
  ]);

  if (exactMatches.has(normalized)) {
    return exactMatches.get(normalized) || 0;
  }

  if (/^src\/app\/api\/.+\/route\.(ts|js)$/.test(normalized)) return 88;
  if (/^app\/api\/.+\/route\.(ts|js)$/.test(normalized)) return 88;
  if (/^pages\/api\/.+\.(ts|js)$/.test(normalized)) return 86;
  if (/^src\/.+\/index\.(ts|tsx|js|jsx)$/.test(normalized)) return 84;
  if (/^src\/(app|pages|routes|router|server|lib|core)\//.test(normalized)) return 76;
  if (/^cmd\/.+\/main\.go$/.test(normalized)) return 84;
  if (/^(docs|doc)\//.test(normalized)) return 64;
  if (normalized.includes('example')) return 60;
  if (normalized.includes('readme')) return 50;

  return 0;
}

function selectCandidateFiles(tree: TreeItem[], limit: number) {
  return tree
    .filter((item) => item.type === 'blob')
    .map((item) => ({
      path: item.path,
      score: scoreCandidateFile(item.path),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit)
    .map((item) => item.path);
}

function selectDocumentationFiles(tree: TreeItem[], limit = 6) {
  return tree
    .filter((item) => item.type === 'blob')
    .map((item) => item.path)
    .filter((path) => /(^docs\/|^doc\/|guide|tutorial|example|examples\/|getting-started|quickstart)/i.test(path))
    .sort((left, right) => left.localeCompare(right))
    .slice(0, limit);
}

function formatInterestingFiles(files: Array<{ path: string; content: string }>) {
  return files
    .filter((file) => file.content.trim())
    .map((file) => {
      const excerpt = file.content
        .split('\n')
        .slice(0, 60)
        .join('\n')
        .trim()
        .slice(0, 2600);

      return `## ${file.path}\n\`\`\`\n${excerpt}\n\`\`\``;
    })
    .join('\n\n');
}

export async function fetchRepositoryFiles(fullName: string, filePaths: string[], ref?: string) {
  const uniquePaths = [...new Set(filePaths.filter(Boolean))].slice(0, getNumberSetting('ANALYSIS_FILE_LIMIT', 8));

  const files = await Promise.all(
    uniquePaths.map(async (path) => ({
      path,
      content: await getFileContent(fullName, path, ref),
    }))
  );

  return files
    .filter((file) => file.content.trim())
    .map((file) => ({
      path: file.path,
      content: file.content.slice(0, 4500),
    }));
}

export async function fetchRepositoryScan(fullName: string): Promise<RepositoryScanResult> {
  const metadata = await getRepositoryMetadata(fullName);
  const defaultBranch = metadata.default_branch || 'HEAD';
  const repositoryRef = await getRepositoryRef(fullName, defaultBranch);
  const treeRef = repositoryRef?.treeSha || defaultBranch;
  const fileRef = repositoryRef?.commitSha;
  const [readme, treeResponse] = await Promise.all([
    getReadmeContent(fullName, fileRef),
    getRepositoryTree(fullName, treeRef),
  ]);

  const analysisFileLimit = Math.max(4, getNumberSetting('ANALYSIS_FILE_LIMIT', 8));
  const candidateFiles = selectCandidateFiles(treeResponse.tree, analysisFileLimit);
  const documentationFiles = selectDocumentationFiles(treeResponse.tree, 6);
  const factSourceFiles = await fetchRepositoryFiles(
    fullName,
    candidateFiles.slice(0, Math.min(candidateFiles.length, 4)),
    fileRef
  );
  const packageFacts = factSourceFiles.find((file) => file.path === 'package.json')?.content || '';

  return {
    readme,
    structure: buildDirectoryStructure(treeResponse.tree) + (treeResponse.truncated ? '\n...' : ''),
    facts: [
      formatPackageFacts(packageFacts),
      formatInterestingFiles(factSourceFiles),
    ]
      .filter(Boolean)
      .join('\n\n'),
    candidateFiles,
    documentationFiles,
    repositoryRef,
  };
}

export async function fetchRepositoryContext(fullName: string): Promise<{ readme: string; structure: string; facts: string }> {
  const scan = await fetchRepositoryScan(fullName);

  return {
    readme: scan.readme,
    structure: scan.structure,
    facts: scan.facts,
  };
}

export async function syncStarredRepos(): Promise<SyncResult> {
  if (syncInFlight) {
    console.log('GitHub sync already in progress. Reusing the current run.');
    return syncInFlight;
  }

  syncInFlight = (async () => {
  const { username: githubUsername, token: githubToken } = getGitHubConfig();

  if (!githubUsername && !githubToken) {
    throw new Error('GITHUB_USERNAME or GITHUB_TOKEN must be configured.');
  }

  console.log(`Syncing starred repositories for ${githubUsername || 'authenticated user'}...`);

  try {
    const githubStarApi = createGithubApi('application/vnd.github.star+json');
    const allRepos: StarredRepoResponse[] = [];
    let page = 1;
    const perPage = 100;
    const endpoint = githubToken ? '/user/starred' : `/users/${githubUsername}/starred`;

    while (true) {
      const response = await githubStarApi.get<StarredRepoResponse[]>(endpoint, {
        params: {
          per_page: perPage,
          page,
          sort: 'created',
          direction: 'asc',
        },
      });

      const repos = response.data;
      if (repos.length === 0) {
        break;
      }

      allRepos.push(...repos);
      page += 1;

      if (allRepos.length >= 10000) {
        break;
      }
    }

    const upsertProject = db.prepare(`
      INSERT INTO projects (
        github_id, full_name, name, owner, description,
        html_url, stars, language, topics, fork, homepage,
        created_at, updated_at, starred_at, synced_at
      ) VALUES (
        @github_id, @full_name, @name, @owner, @description,
        @html_url, @stars, @language, @topics, @fork, @homepage,
        @created_at, @updated_at, @starred_at, CURRENT_TIMESTAMP
      )
      ON CONFLICT(github_id) DO UPDATE SET
        full_name = @full_name,
        name = @name,
        owner = @owner,
        description = @description,
        html_url = @html_url,
        stars = @stars,
        language = @language,
        topics = @topics,
        fork = @fork,
        homepage = @homepage,
        updated_at = @updated_at,
        starred_at = @starred_at,
        synced_at = CURRENT_TIMESTAMP
    `);

    const getProjectIdByGitHubId = db.prepare(`
      SELECT id FROM projects WHERE github_id = ?
    `);

    let newCount = 0;
    let updatedCount = 0;
    let queuedCount = 0;
    let alreadyQueuedCount = 0;
    let alreadyGeneratedCount = 0;

    const transaction = db.transaction((repos: StarredRepoResponse[]) => {
      for (const entry of repos) {
        const repo = entry.repo;
        const existing = getProjectIdByGitHubId.get(repo.id) as { id: number } | undefined;

        upsertProject.run({
          github_id: repo.id,
          full_name: repo.full_name,
          name: repo.name,
          owner: repo.owner.login,
          description: repo.description,
          html_url: repo.html_url,
          stars: repo.stargazers_count,
          language: repo.language,
          topics: JSON.stringify(repo.topics || []),
          fork: repo.fork ? 1 : 0,
          homepage: repo.homepage,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          starred_at: entry.starred_at,
        });

        if (!existing) {
          const project = getProjectIdByGitHubId.get(repo.id) as { id: number };
          const enqueueResult = enqueueGenerateTask(project.id, 1);
          if (enqueueResult.reason === 'queued') {
            queuedCount += 1;
          } else if (enqueueResult.reason === 'already_pending') {
            alreadyQueuedCount += 1;
          } else if (enqueueResult.reason === 'already_generated') {
            alreadyGeneratedCount += 1;
          }
          newCount += 1;
        } else {
          updatedCount += 1;
        }
      }
    });

    transaction(allRepos);

    return {
      total: allRepos.length,
      new: newCount,
      updated: updatedCount,
      queued: queuedCount,
      alreadyQueued: alreadyQueuedCount,
      alreadyGenerated: alreadyGeneratedCount,
    };
  } catch (error) {
    console.error('GitHub sync failed:', error);
    throw error;
  } finally {
    syncInFlight = null;
  }
  })();

  return syncInFlight;
}

export function getProjects(options: {
  page?: number;
  pageSize?: number;
  language?: string;
  sortBy?: 'stars' | 'synced_at';
} = {}) {
  const {
    page = 1,
    pageSize = 21,
    language,
    sortBy = 'synced_at',
  } = options;

  const offset = (page - 1) * pageSize;
  let sql = `
    SELECT
      p.*,
      (
        SELECT tq.task_type
        FROM task_queue tq
        WHERE tq.project_id = p.id
          AND tq.status IN ('processing', 'pending')
        ORDER BY
          CASE tq.status WHEN 'processing' THEN 0 ELSE 1 END,
          tq.priority ASC,
          COALESCE(tq.available_at, tq.created_at) ASC,
          tq.created_at ASC,
          tq.id ASC
        LIMIT 1
      ) AS current_task_type,
      (
        SELECT tq.status
        FROM task_queue tq
        WHERE tq.project_id = p.id
          AND tq.status IN ('processing', 'pending')
        ORDER BY
          CASE tq.status WHEN 'processing' THEN 0 ELSE 1 END,
          tq.priority ASC,
          COALESCE(tq.available_at, tq.created_at) ASC,
          tq.created_at ASC,
          tq.id ASC
        LIMIT 1
      ) AS current_task_status
    FROM projects p
  `;
  const params: (string | number)[] = [];

  if (language) {
    sql += ' WHERE p.language = ?';
    params.push(language);
  }

  sql += ` ORDER BY p.${sortBy} DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const projects = db.prepare(sql).all(...params) as ProjectRecord[];

  let countSql = 'SELECT COUNT(*) as count FROM projects';
  if (language) {
    countSql += ' WHERE language = ?';
  }

  const countResult = db.prepare(countSql).get(...(language ? [language] : [])) as { count: number };

  return {
    projects,
    total: countResult.count,
    page,
    pageSize,
    totalPages: Math.ceil(countResult.count / pageSize),
  };
}

export function getProjectById(id: number) {
  return db.prepare(`
    SELECT
      p.*,
      (
        SELECT tq.task_type
        FROM task_queue tq
        WHERE tq.project_id = p.id
          AND tq.status IN ('processing', 'pending')
        ORDER BY
          CASE tq.status WHEN 'processing' THEN 0 ELSE 1 END,
          tq.priority ASC,
          COALESCE(tq.available_at, tq.created_at) ASC,
          tq.created_at ASC,
          tq.id ASC
        LIMIT 1
      ) AS current_task_type,
      (
        SELECT tq.status
        FROM task_queue tq
        WHERE tq.project_id = p.id
          AND tq.status IN ('processing', 'pending')
        ORDER BY
          CASE tq.status WHEN 'processing' THEN 0 ELSE 1 END,
          tq.priority ASC,
          COALESCE(tq.available_at, tq.created_at) ASC,
          tq.created_at ASC,
          tq.id ASC
        LIMIT 1
      ) AS current_task_status
    FROM projects p
    WHERE p.id = ?
  `).get(id) as ProjectRecord | undefined;
}

export function getProjectByFullName(fullName: string) {
  return db.prepare('SELECT * FROM projects WHERE full_name = ?').get(fullName) as ProjectRecord | undefined;
}

export function getLanguages() {
  return db.prepare(`
    SELECT language, COUNT(*) as count
    FROM projects
    WHERE language IS NOT NULL
    GROUP BY language
    ORDER BY count DESC
  `).all() as LanguageCount[];
}
