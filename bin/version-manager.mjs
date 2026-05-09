#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PKG_PATH = join(ROOT, 'package.json');
const VERSION_TS_PATH = join(ROOT, 'src', 'lib', 'version.ts');

const args = process.argv.slice(2);
const level = (args.find(a => ['--major','--minor','--patch','--from-commit'].includes(a)) || '--patch').replace('--','');
const appLevel = (args.includes('--app-major') ? 'major' : args.includes('--app-minor') ? 'minor' : 'patch');
const dryRun = args.includes('--dry-run');
const skipPush = args.includes('--skip-push');

function readJSON(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}
function writeJSON(p, data) {
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getLatestTag(pattern) {
  try {
    const tag = execSync(`git describe --tags --match "${pattern}" --abbrev=0 2>/dev/null`, { encoding: 'utf-8' }).trim();
    return tag || null;
  } catch { return null; }
}

function getBumpFromCommits(fromTag) {
  const range = fromTag ? `${fromTag}..HEAD` : '--root';
  let log;
  try {
    log = execSync(`git log ${range} --oneline --no-merges`, { encoding: 'utf-8' });
  } catch { return 'patch'; }
  for (const line of log.split('\n')) {
    const msg = line.toLowerCase().replace(/^[0-9a-f]+\s+/, '');
    if (msg.includes('breaking') || msg.includes('!:')) return 'major';
    if (msg.startsWith('feat') || msg.includes('feature')) return 'minor';
  }
  return 'patch';
}

function bumpSemver(version, lvl) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (lvl) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    default: return `${major}.${minor}.${patch + 1}`;
  }
}

function bumpAppVer(ver, lvl) {
  const [major, minor] = ver.split('.').map(Number);
  switch (lvl) {
    case 'major': return `${major + 1}.0`;
    default: return `${major}.${minor + 1}`;
  }
}

function run() {
  const pkg = readJSON(PKG_PATH);
  const current = pkg.version;

  const bumpLevel = level === 'from-commit'
    ? getBumpFromCommits(getLatestTag('v*'))
    : level;

  const next = bumpSemver(current, bumpLevel);
  const tag = `v${next}`;

  let nextAppVer = null;
  let versionTs = null;
  try {
    versionTs = readFileSync(VERSION_TS_PATH, 'utf-8');
    const match = versionTs.match(/APP_VERSION\s*=\s*['"](\d+\.\d+)['"]/);
    if (match) {
      nextAppVer = bumpAppVer(match[1], appLevel);
    }
  } catch {}

  console.log(`Build:   ${current} → ${next}`);
  if (nextAppVer) console.log(`App:     v${nextAppVer}`);
  console.log(`Bump:    ${bumpLevel}`);
  console.log(`Tag:     ${tag}`);

  if (dryRun) {
    console.log('Dry run — no changes');
    process.exit(0);
  }

  pkg.version = next;
  writeJSON(PKG_PATH, pkg);

  let oldAppVer = null;
  if (versionTs) {
    const match = versionTs.match(/APP_VERSION\s*=\s*['"](\d+\.\d+)['"]/);
    if (match) oldAppVer = match[1];
  }

  if (versionTs && nextAppVer && oldAppVer) {
    const updated = versionTs
      .replace(new RegExp(`APP_VERSION\\s*=\\s*['"]${escapeRegex(oldAppVer)}['"]`), `APP_VERSION = '${nextAppVer}'`)
      .replace(/BUILD_VERSION\s*=\s*['"][\d.]+['"]/, `BUILD_VERSION = '${next}'`);
    writeFileSync(VERSION_TS_PATH, updated, 'utf-8');
    console.log(`Updated src/lib/version.ts → v${nextAppVer} / build ${next}`);

    const grepCmd = `git grep -l 'v${oldAppVer}' -- 'src/**/*.ts' 'src/**/*.tsx' 2>/dev/null || true`;
    let files;
    try {
      files = execSync(grepCmd, { cwd: ROOT, encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
    } catch { files = []; }

    if (files.length > 0) {
      for (const file of files) {
        if (!file) continue;
        const content = readFileSync(file, 'utf-8');
        const updatedContent = content.replace(new RegExp(`v${escapeRegex(oldAppVer)}`, 'g'), `v${nextAppVer}`);
        writeFileSync(file, updatedContent, 'utf-8');
      }
      console.log(`Updated v${oldAppVer} → v${nextAppVer} across ${files.length} file(s)`);
    }
  }

  execSync('git add package.json src/lib/version.ts', { cwd: ROOT });
  execSync(`git commit -m "chore(release): bump to ${tag} [skip ci]"`, { cwd: ROOT });
  execSync(`git tag -a ${tag} -m "release ${tag}"`, { cwd: ROOT });
  console.log(`Committed and tagged ${tag}`);

  if (!skipPush) {
    execSync('git push --follow-tags origin HEAD', { cwd: ROOT, stdio: 'inherit' });
    console.log('Pushed to origin');
  }
}

run();
