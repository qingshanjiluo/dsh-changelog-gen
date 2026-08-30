/**
 * dsh-changelog-gen — CHANGELOG生成器
 *
 * 功能：
 * 1. Conventional Commits解析
 * 2. 版本管理
 * 3. 自动分类
 * 4. 提交统计
 *
 * 工具：changelog_generate, changelog_preview, changelog_release, commit_stats
 * 命令：/changelog
 * 配置：enabled
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

export const name = 'dsh-changelog-gen';
export const inject = ['settings', 'tools', 'commands'];

const configSchema = z.object({
  enabled: z.boolean().default(true),
  commitsCount: z.number().min(1).max(500).default(50),
  includeAuthors: z.boolean().default(true),
  includeLinks: z.boolean().default(true),
  unreleased: z.boolean().default(true),
});

type Config = z.infer<typeof configSchema>;

function sanitize(s: string): string {
  return s.replace(/[;&|`$(){}[\]!#~<>'"]/g, '');
}

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function getLatestTag(cwd: string): string {
  return execGit('describe --tags --abbrev=0', cwd);
}

function getCommitsBetween(from: string, to: string, cwd: string): string[] {
  const range = from ? `${sanitize(from)}..${sanitize(to || 'HEAD')}` : sanitize(to || 'HEAD');
  const raw = execGit(`log ${range} --pretty=format:"%H|%s|%an|%ae" --no-merges`, cwd);
  if (!raw) return [];
  return raw.split('\n').filter(Boolean);
}

function getCommitType(msg: string): string {
  const match = msg.match(/^(\w+)(?:\(.+\))?(!)?:\s+/);
  if (!match) return 'other';
  const type = match[1].toLowerCase();
  const valid = ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'ci', 'build'];
  return valid.includes(type) ? type : 'other';
}

function getCommitScope(msg: string): string {
  const match = msg.match(/^\w+\((.+?)\)(?:!)?:\s+/);
  return match ? match[1] : '';
}

function getCommitSubject(msg: string): string {
  return msg.replace(/^\w+(?:\(.+\))?!?:\s+/, '');
}

function parseVersionFromTag(tag: string): { major: number; minor: number; patch: number } | null {
  const match = tag.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
}

interface CommitInfo {
  hash: string;
  subject: string;
  author: string;
  email: string;
  type: string;
  scope: string;
  description: string;
}

function generateCHANGELOG(commits: string[], options: { includeAuthors: boolean; includeLinks: boolean; unreleased: boolean }): string {
  const parsed: CommitInfo[] = commits.map((line) => {
    const [hash, subject, author, email] = line.split('|');
    return {
      hash,
      subject,
      author,
      email,
      type: getCommitType(subject),
      scope: getCommitScope(subject),
      description: getCommitSubject(subject),
    };
  });

  const categories: Record<string, CommitInfo[]> = {
    feat: [], fix: [], perf: [], refactor: [], docs: [], test: [], chore: [], ci: [], build: [],
  };

  for (const c of parsed) {
    if (categories[c.type]) {
      categories[c.type].push(c);
    }
  }

  const labels: Record<string, string> = {
    feat: 'Features', fix: 'Bug Fixes', perf: 'Performance', refactor: 'Refactoring',
    docs: 'Documentation', test: 'Tests', chore: 'Chores', ci: 'CI', build: 'Build',
  };

  const lines: string[] = [];
  const header = options.unreleased ? '## Unreleased' : `## ${new Date().toISOString().slice(0, 10)}`;
  lines.push(header, '');

  for (const [type, items] of Object.entries(categories)) {
    if (items.length === 0) continue;
    lines.push(`### ${labels[type]}`, '');
    for (const c of items) {
      let entry = `- ${c.scope ? `**${c.scope}:** ` : ''}${c.description}`;
      if (options.includeAuthors) {
        entry += ` (${c.author})`;
      }
      if (options.includeLinks) {
        entry += ` ([${c.hash.slice(0, 7)}](${c.hash}))`;
      }
      lines.push(entry);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function detectBumpType(commits: string[]): 'major' | 'minor' | 'patch' {
  let bump: 'major' | 'minor' | 'patch' = 'patch';
  for (const line of commits) {
    const msg = line.split('|')[1];
    if (!msg) continue;
    if (msg.includes('!:')) return 'major';
    const type = getCommitType(msg);
    if (type === 'feat') bump = 'minor';
  }
  return bump;
}

function writeCHANGELOG(content: string, cwd: string): void {
  const filePath = resolve(cwd, 'CHANGELOG.md');
  let existing = '';
  if (existsSync(filePath)) {
    existing = readFileSync(filePath, 'utf-8');
  }
  const body = existing.replace(/^# Changelog\s*\n*/m, '');
  writeFileSync(filePath, '# Changelog\n\n' + content + '\n' + body, 'utf-8');
}

export function apply(ctx: any, config?: Config) {
  if (config && !config.enabled) return;
  const cfg = config || configSchema.parse({});

  ctx.tools.register({
    name: 'changelog_generate',
    description: '从 Git 历史生成 changelog',
    parameters: z.object({
      from: z.string().optional(),
      to: z.string().default('HEAD'),
      output: z.string().optional(),
    }),
    async execute({ from, to, output }: any) {
      const cwd = process.cwd();
      const start = from || getLatestTag(cwd);
      const commits = getCommitsBetween(start, to, cwd);
      const limited = commits.slice(0, cfg.commitsCount);
      const changelog = generateCHANGELOG(limited, {
        includeAuthors: cfg.includeAuthors,
        includeLinks: cfg.includeLinks,
        unreleased: cfg.unreleased,
      });
      if (output) {
        writeFileSync(resolve(cwd, output), changelog, 'utf-8');
      }
      return { changelog, commitsCount: limited.length };
    },
  });

  ctx.tools.register({
    name: 'changelog_preview',
    description: '预览 changelog',
    parameters: z.object({
      from: z.string().optional(),
      to: z.string().default('HEAD'),
    }),
    async execute({ from, to }: any) {
      const cwd = process.cwd();
      const start = from || getLatestTag(cwd);
      const commits = getCommitsBetween(start, to, cwd);
      const limited = commits.slice(0, cfg.commitsCount);
      const changelog = generateCHANGELOG(limited, {
        includeAuthors: cfg.includeAuthors,
        includeLinks: cfg.includeLinks,
        unreleased: cfg.unreleased,
      });
      return { changelog, commitsCount: limited.length };
    },
  });

  ctx.tools.register({
    name: 'changelog_release',
    description: '生成 changelog 并创建版本 tag',
    parameters: z.object({
      cwd: z.string().optional(),
    }),
    async execute({ cwd: workDir }: any) {
      const cwd = workDir || process.cwd();
      const latestTag = getLatestTag(cwd);
      const commits = getCommitsBetween(latestTag, 'HEAD', cwd);
      const limited = commits.slice(0, cfg.commitsCount);
      const bump = detectBumpType(commits);
      const current = parseVersionFromTag(latestTag) || { major: 0, minor: 0, patch: 0 };

      let newVersion: string;
      if (bump === 'major') {
        newVersion = `${current.major + 1}.0.0`;
      } else if (bump === 'minor') {
        newVersion = `${current.major}.${current.minor + 1}.0`;
      } else {
        newVersion = `${current.major}.${current.minor}.${current.patch + 1}`;
      }

      const changelog = generateCHANGELOG(limited, {
        includeAuthors: cfg.includeAuthors,
        includeLinks: cfg.includeLinks,
        unreleased: cfg.unreleased,
      });

      writeCHANGELOG(changelog, cwd);
      execGit(`tag v${newVersion}`, cwd);

      return { bump, previousVersion: latestTag || 'none', newVersion: `v${newVersion}`, changelog };
    },
  });

  ctx.tools.register({
    name: 'commit_stats',
    description: '提交统计',
    parameters: z.object({
      from: z.string().optional(),
      to: z.string().default('HEAD'),
    }),
    async execute({ from, to }: any) {
      const cwd = process.cwd();
      const start = from || getLatestTag(cwd);
      const commits = getCommitsBetween(start, to, cwd);
      const typeCounts: Record<string, number> = {};
      const authorCounts: Record<string, number> = {};
      for (const t of ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'ci', 'build']) typeCounts[t] = 0;
      for (const line of commits) {
        const parts = line.split('|');
        const type = getCommitType(parts[1]);
        if (typeCounts[type] !== undefined) typeCounts[type]++;
        authorCounts[parts[2]] = (authorCounts[parts[2]] || 0) + 1;
      }
      const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
      return { total: commits.length, byType: typeCounts, topAuthors };
    },
  });

  ctx.commands.register({
    name: 'changelog',
    description: 'Changelog 管理',
    async execute(args: string) {
      const parts = args.trim().split(/\s+/);
      const action = parts[0] || 'preview';
      const cwd = process.cwd();
      const from = parts[1] || undefined;
      const start = from || getLatestTag(cwd);
      const commits = getCommitsBetween(start, 'HEAD', cwd);
      const limited = commits.slice(0, cfg.commitsCount);
      if (action === 'generate') {
        const changelog = generateCHANGELOG(limited, { includeAuthors: cfg.includeAuthors, includeLinks: cfg.includeLinks, unreleased: cfg.unreleased });
        writeCHANGELOG(changelog, cwd);
        return { content: `已生成 changelog，共 ${limited.length} 个提交` };
      }
      if (action === 'release') {
        const bump = detectBumpType(commits);
        const current = parseVersionFromTag(start) || { major: 0, minor: 0, patch: 0 };
        const newVersion = bump === 'major' ? `${current.major + 1}.0.0` : bump === 'minor' ? `${current.major}.${current.minor + 1}.0` : `${current.major}.${current.minor}.${current.patch + 1}`;
        const changelog = generateCHANGELOG(limited, { includeAuthors: cfg.includeAuthors, includeLinks: cfg.includeLinks, unreleased: cfg.unreleased });
        writeCHANGELOG(changelog, cwd);
        execGit(`tag v${newVersion}`, cwd);
        return { content: `版本升级: ${bump} | ${start || 'none'} -> v${newVersion}` };
      }
      const changelog = generateCHANGELOG(limited, { includeAuthors: cfg.includeAuthors, includeLinks: cfg.includeLinks, unreleased: cfg.unreleased });
      return { content: changelog };
    },
  });

  ctx.settings.register({
    title: 'changelog-gen',
    description: 'CHANGELOG 生成器',
    config: configSchema,
  });
}
