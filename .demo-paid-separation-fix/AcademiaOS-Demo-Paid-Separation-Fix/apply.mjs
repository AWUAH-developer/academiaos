import fs from 'node:fs';
import path from 'node:path';

const app = process.env.APP;
const patchRoot = process.env.PATCH_ROOT;
if (!app || !patchRoot) throw new Error('APP or PATCH_ROOT is missing');

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function copy(relative) {
  const source = path.join(patchRoot, 'files', relative);
  const target = path.join(app, relative);
  if (!fs.existsSync(source)) throw new Error(`Patch file missing: ${relative}`);
  ensureDir(target);
  fs.copyFileSync(source, target);
}

function edit(relative, transform) {
  const target = path.join(app, relative);
  if (!fs.existsSync(target)) throw new Error(`Required source file missing: ${relative}`);
  const before = fs.readFileSync(target, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`No text change needed: ${relative}`);
    return;
  }
  fs.writeFileSync(target, after);
  console.log(`Updated: ${relative}`);
}

[
  'src/app/actions/demo-access.ts',
  'src/components/DemoAccessWizard.tsx',
  'src/app/(portal)/demo-requests/page.tsx',
  'src/app/(portal)/demo-requests/[id]/create/page.tsx',
  'src/app/(portal)/schools/enrol/page.tsx',
].forEach(copy);

edit('src/app/actions/auth.ts', (input) => {
  let text = input;
  text = text.replace(
    /user && passwordValid && user\.mustChangePassword &&\s*user\.temporaryPasswordExpiresAt && user\.temporaryPasswordExpiresAt <= now/g,
    'user && passwordValid &&\n    user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt <= now',
  );
  text = text.replace(
    'Temporary+password+expired.+Ask+an+administrator+to+reset+it',
    'Temporary+access+or+password+expired.+Contact+an+administrator',
  );
  return text;
});

edit('src/lib/auth.ts', (input) => {
  let text = input;

  if (!text.includes('temporaryPasswordExpiresAt: users.temporaryPasswordExpiresAt')) {
    const marker = '    mustChangePassword: users.mustChangePassword,\n';
    if (!text.includes(marker)) throw new Error('Could not add expiry field to currentUser query');
    text = text.replace(
      marker,
      `${marker}    temporaryPasswordExpiresAt: users.temporaryPasswordExpiresAt,\n`,
    );
  }

  if (!text.includes('const temporaryAccessExpired = Boolean(')) {
    const marker = '  const row = rows[0];\n';
    if (!text.includes(marker)) throw new Error('Could not add current-session expiry check');
    text = text.replace(
      marker,
      `${marker}  const temporaryAccessExpired = Boolean(\n    row?.temporaryPasswordExpiresAt && row.temporaryPasswordExpiresAt <= new Date()\n  );\n`,
    );
  }

  const oldCondition = "  if (!row || row.status !== 'ACTIVE' || (row.schoolId && row.schoolIsActive === false)) {";
  const newCondition = "  if (!row || temporaryAccessExpired || row.status !== 'ACTIVE' || (row.schoolId && row.schoolIsActive === false)) {";
  if (text.includes(oldCondition)) text = text.replace(oldCondition, newCondition);
  else if (!text.includes(newCondition)) throw new Error('Could not enforce expiry for active web sessions');

  return text;
});

for (const relative of [
  'src/app/api/mobile/v1/auth/login/route.ts',
  'src/app/api/desktop/v1/auth/login/route.ts',
]) {
  if (!fs.existsSync(path.join(app, relative))) continue;
  edit(relative, (input) => input.replace(
    /user && passwordValid && user\.mustChangePassword && user\.temporaryPasswordExpiresAt/g,
    'user && passwordValid && user.temporaryPasswordExpiresAt',
  ));
}

console.log('Demo and paid-school workflows installed.');
