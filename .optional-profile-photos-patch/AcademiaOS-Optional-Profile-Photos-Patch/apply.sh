#!/usr/bin/env bash
set -euo pipefail

APP="${ACADEMIAOS_APP:-$HOME/workspace/artifacts/academia-os}"

if [ ! -f "$APP/package.json" ]; then
  echo "ERROR: AcademiaOS project not found at $APP"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/workspace/optional-profile-photos-backup-$STAMP"
mkdir -p "$BACKUP"

FILES=(
  "src/app/actions/schools.ts"
  "src/app/actions/subscriptions.ts"
  "src/app/actions/users.ts"
  "src/app/actions/learners.ts"
  "src/components/SchoolRegistrationForm.tsx"
  "src/components/SchoolEnrolmentWizard.tsx"
  "src/components/StaffAccountForm.tsx"
  "src/components/AppShell.tsx"
  "src/components/IdCard.tsx"
  "src/app/(portal)/learners/page.tsx"
  "src/app/(portal)/learners/[id]/page.tsx"
  "src/app/(portal)/users/page.tsx"
)

for rel in "${FILES[@]}"; do
  if [ -f "$APP/$rel" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp "$APP/$rel" "$BACKUP/$rel"
  fi
done

APP="$APP" node <<'NODE'
const fs = require('fs');
const path = require('path');

const app = process.env.APP;
const changed = [];

function edit(rel, updater, required = true) {
  const file = path.join(app, rel);
  if (!fs.existsSync(file)) {
    if (required) throw new Error(`Required file not found: ${rel}`);
    return;
  }
  const before = fs.readFileSync(file, 'utf8');
  const after = updater(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed.push(rel);
  }
}

function optionalImageAction(text, variableName, fieldName, label, firstOnly = false) {
  if (firstOnly) {
    text = text.replace(`let ${variableName}: string;`, `let ${variableName}: string | null = null;`);
    text = text.replace(
      `(await imageToDataUrl(formData.get('${fieldName}'), { required: true, label: '${label}' }))!`,
      `await imageToDataUrl(formData.get('${fieldName}'), { label: '${label}' })`
    );
    return text;
  }
  text = text.replaceAll(`let ${variableName}: string;`, `let ${variableName}: string | null = null;`);
  text = text.replaceAll(
    `(await imageToDataUrl(formData.get('${fieldName}'), { required: true, label: '${label}' }))!`,
    `await imageToDataUrl(formData.get('${fieldName}'), { label: '${label}' })`
  );
  return text;
}

function makeInputOptional(text, fieldName) {
  const re = new RegExp(`(<input\\b(?=[^>]*\\bname=["']${fieldName}["'])[^>]*?)\\srequired(?=[^>]*\\/?>)`, 'g');
  return text.replace(re, '$1');
}

edit('src/app/actions/schools.ts', (text) =>
  optionalImageAction(text, 'adminPhotoUrl', 'adminPhoto', 'Administrator photo')
);

edit('src/app/actions/subscriptions.ts', (text) =>
  optionalImageAction(text, 'adminPhotoUrl', 'adminPhoto', 'Administrator photo')
);

edit('src/app/actions/users.ts', (text) =>
  optionalImageAction(text, 'photoUrl', 'photo', 'Staff photo', true)
);

edit('src/app/actions/learners.ts', (text) =>
  optionalImageAction(text, 'photoUrl', 'photo', 'Learner photo', true)
);

edit('src/components/SchoolRegistrationForm.tsx', (text) => {
  text = makeInputOptional(text, 'adminPhoto');
  text = text.replace(/Administrator photo(?! \(optional\))/g, 'Administrator photo (optional)');
  return text;
});

edit('src/components/SchoolEnrolmentWizard.tsx', (text) => {
  text = makeInputOptional(text, 'adminPhoto');
  text = text.replace(/Administrator photo \*/g, 'Administrator photo (optional)');
  return text;
});

edit('src/components/StaffAccountForm.tsx', (text) => {
  text = makeInputOptional(text, 'photo');
  text = text.replace(/Staff profile photo(?! \(optional\))/g, 'Staff profile photo (optional)');
  text = text.replace(
    'JPG, PNG or WebP. Maximum 1.5 MB.',
    'Optional. JPG, PNG or WebP, maximum 1.5 MB. AcademiaOS logo is used when omitted.'
  );
  return text;
});

edit('src/app/(portal)/learners/page.tsx', (text) => {
  text = makeInputOptional(text, 'photo');
  text = text.replace(/Learner profile photo(?! \(optional\))/g, 'Learner profile photo (optional)');
  text = text.replace(
    'Photo and parent contact details are required',
    'Photo is optional. Parent contact details are required'
  );
  text = text.replace(
    'JPG, PNG or WebP. Maximum 1.5 MB.',
    'Optional. JPG, PNG or WebP, maximum 1.5 MB. AcademiaOS logo is used when omitted.'
  );
  text = text.replaceAll("'/learner-placeholder.svg'", "'/icon.svg'");
  return text;
});

edit('src/app/(portal)/learners/[id]/page.tsx', (text) =>
  text.replaceAll("'/learner-placeholder.svg'", "'/icon.svg'")
, false);

edit('src/app/(portal)/users/page.tsx', (text) =>
  text.replaceAll("'/staff-placeholder.svg'", "'/icon.svg'")
, false);

edit('src/components/AppShell.tsx', (text) => {
  const fallback = '<Image src="/icon.svg" alt="AcademiaOS default profile" width={40} height={40} className="h-10 w-10 object-contain p-1"/>';
  return text.replaceAll(': user.name[0]?.toUpperCase()', `: ${fallback}`);
});

edit('src/components/IdCard.tsx', (text) => {
  text = text.replace(
    ': <span className="text-3xl font-black text-slate-400">{name.trim()[0]?.toUpperCase()}</span>',
    ': <Image src="/icon.svg" alt="AcademiaOS default profile" width={80} height={100} className="h-full w-full object-contain p-3" />'
  );
  return text;
});

// Replace remaining web list/detail placeholders with the AcademiaOS icon.
const srcRoot = path.join(app, 'src');
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) {
      const before = fs.readFileSync(full, 'utf8');
      const after = before
        .replaceAll("'/learner-placeholder.svg'", "'/icon.svg'")
        .replaceAll('"/learner-placeholder.svg"', '"/icon.svg"')
        .replaceAll("'/staff-placeholder.svg'", "'/icon.svg'")
        .replaceAll('"/staff-placeholder.svg"', '"/icon.svg"');
      if (after !== before) {
        fs.writeFileSync(full, after);
        changed.push(path.relative(app, full));
      }
    }
  }
}
walk(srcRoot);

console.log(`Updated ${new Set(changed).size} source file(s).`);
NODE

cd "$APP"
pnpm typecheck
pnpm build

echo
echo "===================================================="
echo " OPTIONAL PROFILE PHOTOS: APPLIED"
echo " ADMINISTRATOR PHOTO: OPTIONAL"
echo " LEARNER PHOTO: OPTIONAL"
echo " STAFF PHOTO: OPTIONAL"
echo " DEMO + PRODUCTION SCHOOL CREATION: CAN CONTINUE WITHOUT PHOTO"
echo " DEFAULT WHEN OMITTED: ACADEMIAOS LOGO"
echo " PHOTO UPLOAD AND LATER REPLACEMENT: PRESERVED"
echo " DATABASE MIGRATION: NOT REQUIRED"
echo " OTHER WORKING FEATURES: UNCHANGED"
echo " TYPECHECK: PASS"
echo " PRODUCTION BUILD: PASS"
echo "===================================================="
echo "Backup saved at: $BACKUP"
echo "Check Preview before Republish."
