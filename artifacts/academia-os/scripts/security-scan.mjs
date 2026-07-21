import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INCLUDED_DIRS = ['src', 'scripts', 'tests'];
const INCLUDED_FILES = ['package.json', 'next.config.mjs', '.replit'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json']);
const findings = [];

const patterns = [
  { name: 'Supabase secret key', pattern: /sb_secret_[A-Za-z0-9_-]{12,}/g },
  { name: 'Stripe live secret', pattern: /sk_live_[A-Za-z0-9]{12,}/g },
  { name: 'Private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Hard-coded PostgreSQL credentials', pattern: /postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]+@/gi }
];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

const files = [];
for (const directory of INCLUDED_DIRS) files.push(...await walk(path.join(ROOT, directory)));
for (const file of INCLUDED_FILES) files.push(path.join(ROOT, file));

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  for (const rule of patterns) {
    for (const match of content.matchAll(rule.pattern)) {
      const line = content.slice(0, match.index).split('\n').length;
      findings.push(`${path.relative(ROOT, file)}:${line} ${rule.name}`);
    }
  }
}

if (findings.length) {
  console.error('Potential hard-coded secrets found:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} source and configuration files.`);
