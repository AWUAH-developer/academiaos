import fs from 'node:fs';
import path from 'node:path';

const app = process.env.APP;
const patchRoot = process.env.PATCH_ROOT;
if (!app || !patchRoot) throw new Error('APP or PATCH_ROOT is missing');

const files = [
  'src/lib/email.ts',
  'src/app/actions/demo-access.ts',
  'src/components/DemoAccessWizard.tsx',
  'src/components/CopyDemoInvitationButton.tsx',
  'src/app/(portal)/demo-requests/[id]/create/page.tsx',
];

for (const relative of files) {
  const source = path.join(patchRoot, 'files', relative);
  const target = path.join(app, relative);
  if (!fs.existsSync(source)) throw new Error(`Patch file missing: ${relative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`Installed: ${relative}`);
}

console.log('Demo email invitation feature installed.');
