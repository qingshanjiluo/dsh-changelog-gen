import { execSync, readFileSync, existsSync } from 'child_process';
import { readFileSync as fsRead, writeFileSync as fsWrite, existsSync as fsExists } from 'fs';
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

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function getLatestTag(cwd: string): string {
  return execGit('describe --tags --abbrev=0 2>/dev/null', cwd);
}

function getCommitsBetween(from: string, to: string, cwd: string): string[] {
  const range = from ? `${from}..${to}` : to;
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
  if (fsExists(filePath)) {
    existing = fsRead(filePath, 'utf-8');
  }
  const headerMatch = existing.match(/^# Changelog/m);
  const header = headerMatch ? '# Changelog\n\n' : '# Changelog\n\n';
  const body = existing.replace(/^# Changelog\s*\n*/m, '');
  fsWrite(filePath, header + content + '\n' + body, 'utf-8');
}

export default function (settings: any, tools: any, commands: any) {
  const cfg = configSchema.parse(settings?.get('dsh-changelog-gen') ?? {});

  if (!cfg.enabled) return;

  tools.register('changelog_generate', {
    description: 'Generate changelog from git history',
    parameters: z.object({
      from: z.string().optional().describe('Starting tag or commit hash'),
      to: z.string().default('HEAD').describe('Ending tag or commit hash'),
      output: z.string().optional().describe('Output file path'),
    }),
    async execute({ from, to, output }) {
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
        fsWrite(resolve(cwd, output), changelog, 'utf-8');
      }
      return { changelog, commitsCount: limited.length };
    },
  });

  tools.register('changelog_preview', {
    description: 'Preview changelog without writing to file',
    parameters: z.object({
      from: z.string().optional().describe('Starting tag or commit hash'),
      to: z.string().default('HEAD').describe('Ending tag or commit hash'),
    }),
    async execute({ from, to }) {
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

  tools.register('changelog_release', {
    description: 'Generate changelog, determine version bump, and create git tag',
    parameters: z.object({
      cwd: z.string().optional().describe('Working directory'),
    }),
    async execute({ cwd: workDir }) {
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

  tools.register('commit_stats', {
    description: 'Get commit statistics including count by type, top contributors, and files changed',
    parameters: z.object({
      from: z.string().optional().describe('Starting tag or commit hash'),
      to: z.string().default('HEAD').describe('Ending tag or commit hash'),
    }),
    async execute({ from, to }) {
      const cwd = process.cwd();
      const start = from || getLatestTag(cwd);
      const commits = getCommitsBetween(start, to, cwd);

      const typeCounts: Record<string, number> = {};
      const authorCounts: Record<string, number> = {};
      const allTypes = ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'ci', 'build'];

      for (const t of allTypes) typeCounts[t] = 0;

      for (const line of commits) {
        const parts = line.split('|');
        const subject = parts[1];
        const author = parts[2];
        const type = getCommitType(subject);
        if (typeCounts[type] !== undefined) typeCounts[type]++;
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      }

      const topAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const filesChanged = execGit(`diff --name-only ${start || '--root'}..${to}`, cwd)
        .split('\n')
        .filter(Boolean);

      return { total: commits.length, byType: typeCounts, topAuthors, filesChanged };
    },
  });

  commands.register('changelog', {
    description: 'Changelog management commands',
    subcommands: {
      generate: {
        description: 'Generate and write changelog',
        async execute(args: string) {
          const from = args.split(/\s+/)[0] || undefined;
          const cwd = process.cwd();
          const start = from || getLatestTag(cwd);
          const commits = getCommitsBetween(start, 'HEAD', cwd);
          const limited = commits.slice(0, cfg.commitsCount);
          const changelog = generateCHANGELOG(limited, {
            includeAuthors: cfg.includeAuthors,
            includeLinks: cfg.includeLinks,
            unreleased: cfg.unreleased,
          });
          writeCHANGELOG(changelog, cwd);
          return `Changelog generated with ${limited.length} commits`;
        },
      },
      preview: {
        description: 'Preview changelog without writing',
        async execute(args: string) {
          const from = args.split(/\s+/)[0] || undefined;
          const cwd = process.cwd();
          const start = from || getLatestTag(cwd);
          const commits = getCommitsBetween(start, 'HEAD', cwd);
          const limited = commits.slice(0, cfg.commitsCount);
          return generateCHANGELOG(limited, {
            includeAuthors: cfg.includeAuthors,
            includeLinks: cfg.includeLinks,
            unreleased: cfg.unreleased,
          });
        },
      },
      release: {
        description: 'Generate changelog and create release tag',
        async execute() {
          const cwd = process.cwd();
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

          return `Bump: ${bump} | Previous: ${latestTag || 'none'} | New: v${newVersion}`;
        },
      },
      stats: {
        description: 'Show commit statistics',
        async execute(args: string) {
          const from = args.split(/\s+/)[0] || undefined;
          const cwd = process.cwd();
          const start = from || getLatestTag(cwd);
          const commits = getCommitsBetween(start, 'HEAD', cwd);

          const typeCounts: Record<string, number> = {};
          const authorCounts: Record<string, number> = {};
          const allTypes = ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'ci', 'build'];

          for (const t of allTypes) typeCounts[t] = 0;

          for (const line of commits) {
            const parts = line.split('|');
            const subject = parts[1];
            const author = parts[2];
            const type = getCommitType(subject);
            if (typeCounts[type] !== undefined) typeCounts[type]++;
            authorCounts[author] = (authorCounts[author] || 0) + 1;
          }

          const topAuthors = Object.entries(authorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          const lines = [`Total commits: ${commits.length}`, '', 'By type:'];
          for (const [type, count] of Object.entries(typeCounts)) {
            if (count > 0) lines.push(`  ${type}: ${count}`);
          }
          lines.push('', 'Top contributors:');
          for (const [name, count] of topAuthors) {
            lines.push(`  ${name}: ${count}`);
          }

          return lines.join('\n');
        },
      },
    },
  });
}
