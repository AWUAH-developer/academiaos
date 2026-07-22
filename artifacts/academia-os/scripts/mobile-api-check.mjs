import fs from 'node:fs';
import path from 'node:path';

const requiredRoutes = [
  'status',
  'auth/login',
  'auth/refresh',
  'auth/logout',
  'auth/change-password',
  'profile',
  'learners',
  'attendance',
  'fees',
  'payments',
  'results',
  'reports',
  'announcements',
  'notifications',
  'devices'
];

const root = process.cwd();
const missing = requiredRoutes.filter((route) => !fs.existsSync(path.join(root, 'src/app/api/mobile/v1', route, 'route.ts')));
if (missing.length) {
  console.error(`Mobile API check failed. Missing routes: ${missing.join(', ')}`);
  process.exit(1);
}
const schema = fs.readFileSync(path.join(root, 'src/db/schema.ts'), 'utf8');
for (const table of ['mobileDevices', 'mobileSessions']) {
  if (!schema.includes(`export const ${table}`)) {
    console.error(`Mobile API check failed. Missing schema table: ${table}`);
    process.exit(1);
  }
}
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error('Mobile API requires Node.js 22 or later.');
  process.exit(1);
}
console.log(`AcademiaOS Mobile API v1 verified: ${requiredRoutes.length} routes, Node.js ${process.versions.node}.`);
