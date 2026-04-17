/**
 * Quick check: are required Supabase tables reachable with anon key?
 * Usage: node scripts/check-supabase-connection.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

function readEnvLocal(root) {
  const envPath = path.join(root, '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    map[k] = v.replace(/^["']|["']$/g, '');
  }
  return map;
}

async function checkTable(sb, table) {
  const { data, error } = await sb.from(table).select('*').limit(1);
  if (error) {
    return {
      table,
      ok: false,
      error: {
        message: error.message,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
      },
    };
  }
  return { table, ok: true, rows: Array.isArray(data) ? data.length : null };
}

async function main() {
  const root = path.join(__dirname, '..');
  const env = readEnvLocal(root);
  const url = env.VITE_SUPABASE_URL || '';
  const key = env.VITE_SUPABASE_ANON_KEY || '';

  console.log(
    JSON.stringify(
      {
        env: {
          hasUrl: Boolean(url),
          hasKey: Boolean(key),
          url: url ? `${url.slice(0, 40)}...` : '',
        },
      },
      null,
      2,
    ),
  );

  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = await Promise.all([
    checkTable(sb, 'app_users'),
    checkTable(sb, 'managed_template_catalog'),
  ]);
  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((e) => {
  console.error('fatal', e);
  process.exit(1);
});

