import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const PAGE = 'https://music.youtube.com/';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

// Finds the ytcfg.set({...}) call carrying EXPERIMENT_FLAGS and client versions.
export function parseYtcfg(html) {
  for (let i = html.indexOf('ytcfg.set('); i !== -1; i = html.indexOf('ytcfg.set(', i + 1)) {
    const start = html.indexOf('{', i);
    if (start === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = start; j < html.length; j++) {
      const c = html[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
      } else if (c === '{') {
        depth++;
      } else if (c === '}' && --depth === 0) {
        try {
          const cfg = JSON.parse(html.slice(start, j + 1));
          if (typeof cfg.EXPERIMENT_FLAGS === 'object' && cfg.EXPERIMENT_FLAGS !== null) {
            const innertube = cfg.INNERTUBE_CLIENT_VERSION;
            const player = cfg.PLAYER_CLIENT_VERSION;
            if (typeof innertube === 'string' && typeof player === 'string') return cfg;
          }
        } catch {
          // not the ytcfg payload, try the next occurrence
        }
        break;
      }
    }
  }
  throw new Error('ytcfg.set() with EXPERIMENT_FLAGS and client versions not found');
}

// Appends unseen flags/versions; returns the updated files plus what was new.
export function merge(flags, versions, cfg) {
  const newFlags = Object.keys(cfg.EXPERIMENT_FLAGS)
    .filter((flag) => !Object.hasOwn(flags, flag))
    .sort();
  for (const flag of newFlags) flags[flag] = {};

  const newVersions = {};
  for (const [kind, version] of [
    ['innertube', cfg.INNERTUBE_CLIENT_VERSION],
    ['player', cfg.PLAYER_CLIENT_VERSION],
  ]) {
    if (!versions[kind].includes(version)) {
      newVersions[kind] = version;
      versions[kind] = [...versions[kind], version].sort();
    }
  }

  return { flags, versions, newFlags, newVersions };
}

async function notify(cfg, newFlags, newVersions) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error('DISCORD_WEBHOOK_URL is not set');

  const lines = [];
  if (newFlags.length > 0) {
    lines.push(`**New EXPERIMENT_FLAGS** (${newFlags.length})`, ...newFlags.map((f) => `- \`${f}\``));
  }
  if (Object.keys(newVersions).length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(
      '**Client version**',
      `- INNERTUBE_CLIENT_VERSION: \`${cfg.INNERTUBE_CLIENT_VERSION}\``,
      `- PLAYER_CLIENT_VERSION: \`${cfg.PLAYER_CLIENT_VERSION}\``,
    );
  }

  // ponytail: 1990-char cut instead of chunked messages, split if flag batches ever get this big
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n').slice(0, 1990) }),
  });
  if (!res.ok) throw new Error(`Discord webhook responded ${res.status}: ${await res.text()}`);
}

async function main() {
  const res = await fetch(PAGE, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${PAGE}`);
  const cfg = parseYtcfg(await res.text());

  const flags = JSON.parse(await readFile('flags.json', 'utf8'));
  const versions = JSON.parse(await readFile('versions.json', 'utf8'));
  const { flags: nextFlags, versions: nextVersions, newFlags, newVersions } = merge(flags, versions, cfg);

  if (newFlags.length === 0 && Object.keys(newVersions).length === 0) {
    console.log('no new flags or client versions');
    return;
  }

  if (newFlags.length > 0) {
    console.log(`new flags: ${newFlags.join(', ')}`);
    await writeFile('flags.json', JSON.stringify(nextFlags, null, 2) + '\n');
  }
  if (Object.keys(newVersions).length > 0) {
    console.log(`new versions: ${JSON.stringify(newVersions)}`);
    await writeFile('versions.json', JSON.stringify(nextVersions, null, 2) + '\n');
  }
  await notify(cfg, newFlags, newVersions);
  console.log('posted to Discord');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
