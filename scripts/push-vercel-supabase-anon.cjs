/**
 * Reads VITE_SUPABASE_ANON_KEY from .env.local and adds it to Vercel
 * (production + development).
 * Usage: node scripts/push-vercel-supabase-anon.cjs
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');
const text = fs.readFileSync(envPath, 'utf8');
let anon = '';
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const m = t.match(/^VITE_SUPABASE_ANON_KEY\s*=\s*(.*)$/);
  if (m) {
    anon = m[1].trim().replace(/^["']|["']$/g, '');
    break;
  }
}
if (!anon) {
  console.error(
    'VITE_SUPABASE_ANON_KEY is missing or empty in .env.local (non-comment line).',
  );
  process.exit(1);
}

function add(name, environment) {
  const sensitive = environment === 'production' ? ' --sensitive' : '';
  const line = `npx vercel --non-interactive env add ${name} ${environment}${sensitive} --yes --force`;
  const cmd = process.platform === 'win32' ? 'cmd.exe' : 'sh';
  const cmdArgs =
    process.platform === 'win32' ? ['/d', '/s', '/c', line] : ['-c', line];
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    input: anon,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: false,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    console.error(r.stderr || '');
    process.exit(r.status ?? 1);
  }
}

for (const env of ['production', 'development']) {
  console.error(`Adding VITE_SUPABASE_ANON_KEY -> ${env}...`);
  add('VITE_SUPABASE_ANON_KEY', env);
}
console.error('Done.');
