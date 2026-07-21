import { spawn } from 'node:child_process';

const isPublished = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('Refusing to start: DATABASE_URL is missing. Add it to Replit Secrets and Published App Secrets.');
  process.exit(1);
}

if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  console.error('Refusing to start: DATABASE_URL is not a PostgreSQL connection string.');
  process.exit(1);
}

if (isPublished && process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true' && process.env.ACADEMIAOS_DEMO_MODE !== 'true') {
  console.error('Refusing to expose demo credentials unless ACADEMIAOS_DEMO_MODE=true.');
  process.exit(1);
}

const port = process.env.PORT || '3000';
const child = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: process.env
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
