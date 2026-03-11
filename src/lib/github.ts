import axios, { AxiosError } from 'axios';
import db from './db';

const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  },
  timeout: 30000,
});

const githubStarApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.star+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  },
  timeout: 30000,
});

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

interface RepositoryContext {
  readme: string;
  structure: string;
  facts: string;
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
    const response = await githubApi.get<GitHubRepo>(`/repos/${fullName}`);
    return response.data;
  } catch (error) {
    throw new Error(getGitHubErrorMessage(error, `Failed to load repository metadata for ${fullName}`));
  }
}

export async function fetchGitHubProfile() {
  const fallbackLogin = GITHUB_USERNAME || null;

  if (!GITHUB_TOKEN && !GITHUB_USERNAME) {
    return null;
  }

  try {
    const endpoint = GITHUB_TOKEN ? '/user' : `/users/${GITHUB_USERNAME}`;
    const response = await githubApi.get<GitHubUserProfile>(endpoint);
    return response.data;
  } catch (error) {
    console.error(getGitHubErrorMessage(error, `Failed to load GitHub profile for ${fallbackLogin || 'user'}`));
    return null;
  }
}

async function getReadmeContent(fullName: string): Promise<string> {
  try {
    const response = await githubApi.get<string>(`/repos/${fullName}/readme`, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
      },
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

async function getFileContent(fullName: string, filePath: string): Promise<string> {
  try {
    const response = await githubApi.get<string>(`/repos/${fullName}/contents/${filePath}`, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
      },
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

function buildDirectoryStructure(tree: TreeItem[], maxDepth = 3) {
  const ignoreRoots = new Set([
    '.git',
    '.github',
    '.next',
    '__pycache__',
    'bin',
    'build',
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
        && !segments.some((segment) => segment.startsWith('.'));
    })
    .sort((left, right) => left.path.localeCompare(right.path))
    .slice(0, 250)
    .map((item) => `${'  '.repeat(item.path.split('/').length - 1)}${item.path.split('/').at(-1)}${item.type === 'tree' ? '/' : ''}`)
    .join('\n');
}

async function getRepositoryTree(fullName: string, defaultBranch: string) {
  try {
    const response = await githubApi.get<{ tree: TreeItem[]; truncated: boolean }>(
      `/repos/${fullName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
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

function selectInterestingFiles(tree: TreeItem[]) {
  const exactMatches = new Set([
    'package.json',
    'requirements.txt',
    'pyproject.toml',
    'go.mod',
    'Cargo.toml',
    'composer.json',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'vite.config.js',
    'vite.config.ts',
    'tsconfig.json',
    '.env.example',
    'src/index.ts',
    'src/index.tsx',
    'src/main.ts',
    'src/main.tsx',
    'src/app.ts',
    'src/app.tsx',
    'src/App.tsx',
    'src/App.vue',
    'src/routes.ts',
    'src/router.ts',
    'app/page.tsx',
    'app/layout.tsx',
    'main.py',
    'app.py',
    'main.go',
  ]);

  const patternMatches = [
    /^src\/app\/api\/.+\/route\.(ts|js)$/,
    /^pages\/api\/.+\.(ts|js)$/,
    /^app\/api\/.+\/route\.(ts|js)$/,
    /^cmd\/.+\/main\.go$/,
    /^src\/.+\/index\.(ts|tsx|js|jsx)$/,
  ];

  return tree
    .filter((item) => item.type === 'blob')
    .filter((item) => exactMatches.has(item.path) || patternMatches.some((pattern) => pattern.test(item.path)))
    .sort((left, right) => left.path.localeCompare(right.path))
    .slice(0, 8);
}

function formatInterestingFiles(files: Array<{ path: string; content: string }>) {
  return files
    .filter((file) => file.content.trim())
    .map((file) => {
      const excerpt = file.content
        .split('\n')
        .slice(0, 80)
        .join('\n')
        .trim();

      return `## ${file.path}\n\`\`\`\n${excerpt}\n\`\`\``;
    })
    .join('\n\n');
}

export async function fetchRepositoryContext(fullName: string): Promise<RepositoryContext> {
  const metadata = await getRepositoryMetadata(fullName);
  const [readme, treeResponse] = await Promise.all([
    getReadmeContent(fullName),
    getRepositoryTree(fullName, metadata.default_branch || 'HEAD'),
  ]);

  const structure = buildDirectoryStructure(treeResponse.tree) + (treeResponse.truncated ? '\n...' : '');
  const interestingFiles = selectInterestingFiles(treeResponse.tree);
  const fileContents = await Promise.all(
    interestingFiles.map(async (file) => ({
      path: file.path,
      content: await getFileContent(fullName, file.path),
    }))
  );

  const packageFacts = fileContents.find((file) => file.path === 'package.json')?.content || '';
  const facts = [
    formatPackageFacts(packageFacts),
    formatInterestingFiles(fileContents),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    readme,
    structure,
    facts,
  };
}

export async function syncStarredRepos() {
  if (!GITHUB_USERNAME && !GITHUB_TOKEN) {
    throw new Error('GITHUB_USERNAME or GITHUB_TOKEN must be configured.');
  }

  console.log(`Syncing starred repositories for ${GITHUB_USERNAME || 'authenticated user'}...`);

  try {
    const allRepos: StarredRepoResponse[] = [];
    let page = 1;
    const perPage = 100;
    const endpoint = GITHUB_TOKEN ? '/user/starred' : `/users/${GITHUB_USERNAME}/starred`;

    while (true) {
      const response = await githubStarApi.get<StarredRepoResponse[]>(endpoint, {
        params: {
          per_page: perPage,
          page,
          sort: 'created',
          direction: 'desc',
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

    const createTask = db.prepare(`
      INSERT INTO task_queue (project_id, task_type, priority)
      VALUES (?, ?, ?)
    `);

    const getProjectIdByGitHubId = db.prepare(`
      SELECT id FROM projects WHERE github_id = ?
    `);

    let newCount = 0;
    let updatedCount = 0;

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
          createTask.run(project.id, 'generate_all', 1);
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
    };
  } catch (error) {
    console.error('GitHub sync failed:', error);
    throw error;
  }
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
  let sql = 'SELECT * FROM projects';
  const params: (string | number)[] = [];

  if (language) {
    sql += ' WHERE language = ?';
    params.push(language);
  }

  sql += ` ORDER BY ${sortBy} DESC LIMIT ? OFFSET ?`;
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
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRecord | undefined;
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
