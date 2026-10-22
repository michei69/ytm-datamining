import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  applyFlagMetadata,
  diffAssets,
  findFlagAnalysisTargets,
  runFlagHarness,
  runVersionHarness,
} from './lib/analysis.mjs';
import { buildChangelogEntry, makeWebhookMessages, prependChangelogEntry } from './lib/changelog.mjs';
import { OpenAIHarness, readModelConfig } from './lib/openai-harness.mjs';
import { loadSnapshot, saveSnapshot } from './lib/snapshot.mjs';

export const PAGE = 'https://music.youtube.com/';
export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

export function normalizeVersions(versions) {
  const current =
    versions?.current ||
    (typeof versions?.innertube === 'string' && typeof versions?.player === 'string'
      ? versions
      : null);
  return {
    innertube:
      (current && typeof current.innertube === 'string' && current.innertube) ||
      (Array.isArray(versions?.innertube) ? versions.innertube.at(-1) : null) ||
      null,
    player:
      (current && typeof current.player === 'string' && current.player) ||
      (Array.isArray(versions?.player) ? versions.player.at(-1) : null) ||
      null,
  };
}

// Appends unseen flags/versions; returns the updated files plus what was new.
// `versions.current` is the authoritative last-observed pair. The arrays remain
// an append-only history, but they cannot be used for change detection because a
// client can roll back to an older value that already exists in the array.
export function merge(flags, versions, cfg) {
  const newFlags = Object.keys(cfg.EXPERIMENT_FLAGS)
    .filter((flag) => !Object.hasOwn(flags, flag))
    .sort();
  for (const flag of newFlags) flags[flag] = {};

  const previousVersions = normalizeVersions(versions);
  const currentVersions = {
    innertube: cfg.INNERTUBE_CLIENT_VERSION,
    player: cfg.PLAYER_CLIENT_VERSION,
  };
  const migratedVersionState = !versions.current;
  let versionStateChanged = migratedVersionState;
  const newVersions = {};
  for (const kind of ['innertube', 'player']) {
    const known = Array.isArray(versions[kind]) ? versions[kind] : [];
    if (!known.includes(currentVersions[kind])) {
      versions[kind] = [...known, currentVersions[kind]].sort();
      versionStateChanged = true;
    }
    if (previousVersions[kind] !== currentVersions[kind]) {
      newVersions[kind] = currentVersions[kind];
      versionStateChanged = true;
    }
  }
  versions.current = currentVersions;

  return {
    flags,
    versions,
    newFlags,
    newVersions,
    previousVersions,
    currentVersions,
    migratedVersionState,
    versionStateChanged,
  };
}

function findNestedString(value, predicate, seen = new Set()) {
  if (typeof value === 'string') return predicate(value) ? value : null;
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  for (const child of Object.values(value)) {
    const found = findNestedString(child, predicate, seen);
    if (found) return found;
  }
  return null;
}

function resolveAssetUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return new URL(raw, PAGE).href;
}

export function extractAssetUrls(html, cfg) {
  let basePath = findNestedString(cfg.WEB_PLAYER_CONTEXT_CONFIGS, (value) => /(?:^|\/)base\.js(?:[?#]|$)/.test(value));
  if (!basePath) {
    const match = html.match(/["']([^"']*\/player\/[^"']*\/base\.js[^"']*)["']/);
    basePath = match?.[1] || null;
  }

  let polymerPath = null;
  const polymerPatterns = [
    /<script[^>]+src=["']([^"']*music_polymer_inlined_html[^"']*\.js[^"']*)["']/i,
    /["']([^"']*music_polymer_inlined_html[^"']*\.js[^"']*)["']/i,
  ];
  for (const pattern of polymerPatterns) {
    const match = html.match(pattern);
    if (match) {
      polymerPath = match[1];
      break;
    }
  }

  return {
    baseUrl: resolveAssetUrl(basePath),
    polymerUrl: resolveAssetUrl(polymerPath),
  };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function flagExistsInText(text, flag) {
  if (typeof text !== 'string' || !text.includes(flag)) return false;
  const pattern = new RegExp(`(?:^|[^A-Za-z0-9_$])${escapeRegex(flag)}(?![A-Za-z0-9_$])`);
  return pattern.test(text);
}

export function normalizeFlagState(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1 || !raw.flags || typeof raw.flags !== 'object') {
    return { version: 1, flags: {} };
  }
  return raw;
}

export function updateFlagPresence(
  flags,
  state,
  sourceTexts,
  liveFlagNames,
  { timestamp = new Date().toISOString(), removalMisses = 3 } = {},
) {
  const combined = sourceTexts.filter(Boolean).join('\n');
  const live = new Set(liveFlagNames);
  const removed = [];
  const reappeared = [];
  const threshold = Math.max(1, Math.min(10, Number(removalMisses) || 3));
  let stateChanged = false;

  for (const [name, value] of Object.entries(flags)) {
    if (!value || typeof value !== 'object') continue;
    const exists = live.has(name) || flagExistsInText(combined, name);
    if (exists) {
      if (state.flags[name]) {
        delete state.flags[name];
        stateChanged = true;
      }
      if (value.removed === true) {
        const next = { ...value };
        delete next.removed;
        flags[name] = next;
        reappeared.push(name);
      }
      continue;
    }

    // Already removed flags do not need miss tracking. If they reappear, the
    // exists branch above clears the marker and reports the reappearance.
    if (value.removed === true) continue;

    const previous = state.flags[name];
    const misses = (Number(previous?.consecutiveMisses) || 0) + 1;
    state.flags[name] = {
      consecutiveMisses: misses,
      lastMissingAt: timestamp,
    };
    stateChanged = true;
    if (misses >= threshold && value.removed !== true) {
      flags[name] = { ...value, removed: true };
      delete state.flags[name];
      removed.push(name);
    }
  }

  return {
    removed: removed.sort(),
    reappeared: reappeared.sort(),
    state,
    stateChanged,
    removalMisses: threshold,
  };
}

async function fetchText(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.text();
}

export function extractScriptUrls(html) {
  const pageOrigin = new URL(PAGE).origin;
  const urls = [];
  for (const match of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], PAGE);
      if (url.origin === pageOrigin && !urls.includes(url.href)) urls.push(url.href);
    } catch {
      // ignore malformed script URLs
    }
  }
  return urls;
}

export async function fetchClientAssets({ fetchImpl = fetch, logger = console } = {}) {
  const html = await fetchText(fetchImpl, PAGE, {
    'user-agent': UA,
    'accept-language': 'en-US,en;q=0.9',
  });
  const cfg = parseYtcfg(html);
  const { baseUrl, polymerUrl } = extractAssetUrls(html, cfg);
  if (!baseUrl) throw new Error('Could not find the player base.js URL in the page');
  if (!polymerUrl) throw new Error('Could not find the Polymer bundle URL in the page');

  const scriptUrls = extractScriptUrls(html);
  const requiredUrls = [...new Set([baseUrl, polymerUrl, ...scriptUrls])];
  logger.log(`downloading ${requiredUrls.length} client script(s), including ${baseUrl}`);
  const entries = await Promise.all(
    requiredUrls.map(async (url) => [
      url,
      await fetchText(fetchImpl, url, { 'user-agent': UA }),
    ]),
  );
  const byUrl = new Map(entries);
  const assets = {
    base: byUrl.get(baseUrl),
    polymer: byUrl.get(polymerUrl),
  };
  const additionalScripts = requiredUrls
    .filter((url) => url !== baseUrl && url !== polymerUrl)
    .map((url) => ({ url, text: byUrl.get(url) }));

  return { html, cfg, assets, additionalScripts, urls: { baseUrl, polymerUrl, scripts: requiredUrls } };
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

function snapshotDirFor(env, root) {
  if (!env.YTM_SNAPSHOT_DIR) return join(root, '.cache/scripts');
  return isAbsolute(env.YTM_SNAPSHOT_DIR) ? env.YTM_SNAPSHOT_DIR : resolve(root, env.YTM_SNAPSHOT_DIR);
}

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

export async function postWebhook(messages, { webhookUrl, fetchImpl = fetch, logger = console } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is not set but there is a change to notify');
  for (const content of messages) {
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (response.ok) break;
      const body = await response.text();
      lastError = new Error(`Discord webhook responded ${response.status}: ${body}`);
      if (response.status !== 429 || attempt === 3) throw lastError;
      let retryAfter = 1_500;
      try {
        const payload = JSON.parse(body);
        retryAfter = Number(payload.retry_after ?? retryAfter) * 1_000;
      } catch {
        // use default delay
      }
      logger.warn(`Discord rate limit; retrying in ${Math.round(retryAfter)} ms`);
      await sleep(retryAfter);
    }
  }
}

export async function run({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  root = ROOT,
  logger = console,
} = {}) {
  const flagsPath = join(root, 'flags.json');
  const versionsPath = join(root, 'versions.json');
  const flagStatePath = join(root, 'flag-state.json');
  const changelogPath = join(root, 'changelog.md');
  const snapshotDir = snapshotDirFor(env, root);
  const runTimestamp = now();

  const { html, cfg, assets, additionalScripts, urls } = await fetchClientAssets({ fetchImpl, logger });
  const flags = await readJson(flagsPath);
  const versions = await readJson(versionsPath);
  let flagStateRaw;
  try {
    flagStateRaw = await readJson(flagStatePath, { version: 1, flags: {} });
  } catch (error) {
    logger.warn(`Ignoring unreadable flag state in ${flagStatePath}: ${error.message}`);
    flagStateRaw = { version: 1, flags: {} };
  }
  const flagState = normalizeFlagState(flagStateRaw);

  const {
    flags: nextFlags,
    versions: nextVersions,
    newFlags,
    newVersions,
    previousVersions,
    currentVersions,
    migratedVersionState,
    versionStateChanged,
  } = merge(flags, versions, cfg);
  const presence = updateFlagPresence(
    nextFlags,
    flagState,
    [assets.base, assets.polymer, ...additionalScripts.map((script) => script.text), html],
    Object.keys(cfg.EXPERIMENT_FLAGS),
    {
      timestamp: runTimestamp.toISOString(),
      removalMisses: env.FLAG_REMOVAL_MISSES,
    },
  );
  const { removed, reappeared } = presence;
  const flagTargets = findFlagAnalysisTargets(nextFlags);
  const versionChanged = Object.keys(newVersions).length > 0;

  const loadedSnapshot = await loadSnapshot(snapshotDir, { logger });
  const snapshotVersions = loadedSnapshot ? normalizeVersions(loadedSnapshot.manifest?.versions) : null;
  const snapshotMatchesVersions =
    loadedSnapshot &&
    snapshotVersions.innertube === previousVersions.innertube &&
    snapshotVersions.player === previousVersions.player;
  if (loadedSnapshot && !snapshotMatchesVersions) {
    logger.warn(
      `Ignoring stale client snapshot: it records ${JSON.stringify(snapshotVersions)} but versions.json records ${JSON.stringify(previousVersions)}`,
    );
  }
  const previousSnapshot = snapshotMatchesVersions ? loadedSnapshot : null;
  let diffText = '';
  if (versionChanged && previousSnapshot) {
    diffText = await diffAssets(previousSnapshot, assets);
  }

  const flagNeedsModel = flagTargets.length > 0;
  const versionNeedsModel = versionChanged && Boolean(previousSnapshot);
  let modelConfig = null;
  if (flagNeedsModel || versionNeedsModel) {
    modelConfig = readModelConfig(env);
  }

  // These are deliberately two distinct harness/model instances and the two
  // independent jobs run concurrently.
  const flagHarness = flagNeedsModel
    ? new OpenAIHarness({ ...modelConfig, fetchImpl, logger })
    : null;
  const versionHarness = versionNeedsModel
    ? new OpenAIHarness({ ...modelConfig, fetchImpl, logger })
    : null;

  const [flagAnalysis, versionAnalysis] = await Promise.all([
    flagNeedsModel
      ? runFlagHarness({
          harness: flagHarness,
          flags: nextFlags,
          targets: flagTargets,
          runtimeFlags: cfg.EXPERIMENT_FLAGS,
          sources: {
            'base.js': assets.base,
            'music_polymer_inlined_html.js': assets.polymer,
            'page.html': html,
            ...Object.fromEntries(
              additionalScripts.map((script, index) => [
                `additional-${index + 1}-${new URL(script.url).pathname.split('/').pop() || 'script.js'}`,
                script.text,
              ]),
            ),
          },
          logger,
        })
      : Promise.resolve(null),
    versionNeedsModel
      ? runVersionHarness({
          harness: versionHarness,
          oldVersions: previousSnapshot ? normalizeVersions(previousSnapshot.manifest?.versions) : previousVersions,
          newVersions,
          diffText,
          oldAssets: previousSnapshot,
          newAssets: assets,
          logger,
        })
      : Promise.resolve(null),
  ]);

  if (flagAnalysis) applyFlagMetadata(nextFlags, flagAnalysis.flags);

  // Verify that every target received the fields it needed. This guards against
  // a provider silently returning a partial tool argument object.
  const remainingTargets = findFlagAnalysisTargets(nextFlags);
  if (remainingTargets.length > 0) {
    throw new Error(
      `Model output left incomplete flag metadata for: ${remainingTargets.map((target) => target.name).join(', ')}`,
    );
  }

  if (flagAnalysis || newFlags.length > 0 || removed.length > 0 || reappeared.length > 0) {
    await writeFile(flagsPath, JSON.stringify(nextFlags, null, 2) + '\n');
  }
  if (presence.stateChanged) {
    await writeFile(flagStatePath, JSON.stringify(presence.state, null, 2) + '\n');
  }
  if (versionChanged || migratedVersionState || versionStateChanged) {
    await writeFile(versionsPath, JSON.stringify(nextVersions, null, 2) + '\n');
  }

  // The first run establishes a comparison baseline. If a new version already
  // exists, this still notifies the user but cannot honestly produce a diff.
  const baselineVersion = versionChanged && !previousSnapshot;
  const snapshotChanged = !previousSnapshot || versionChanged;
  if (snapshotChanged) {
    await saveSnapshot(snapshotDir, {
      ...assets,
      versions: currentVersions,
      urls: { baseUrl: urls.baseUrl, polymerUrl: urls.polymerUrl },
      fetchedAt: runTimestamp.toISOString(),
    });
  }

  const eventHappened =
    newFlags.length > 0 ||
    versionChanged ||
    removed.length > 0 ||
    reappeared.length > 0;

  if (!eventHappened) {
    logger.log(
      flagAnalysis
        ? 'no new flags or client versions; completed missing flag metadata'
        : 'no new flags or client versions',
    );
    return {
      newFlags,
      newVersions,
      removed,
      reappeared,
      flagAnalysis,
      versionAnalysis,
      currentVersions,
      flagState: presence.state,
      snapshotChanged,
      wroteChangelog: false,
    };
  }

  const entry = buildChangelogEntry({
    timestamp: runTimestamp,
    newVersions,
    previousVersions,
    currentVersions,
    versionAnalysis,
    baselineVersion,
    newFlagNames: newFlags,
    removedFlags: removed,
    reappearedFlags: reappeared,
    flags: nextFlags,
  });
  const existingChangelog = await readFile(changelogPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  await writeFile(changelogPath, prependChangelogEntry(existingChangelog, entry));

  const webhookMessages = makeWebhookMessages({
    newVersions,
    previousVersions,
    currentVersions,
    versionAnalysis,
    baselineVersion,
    newFlagNames: newFlags,
    removedFlags: removed,
    reappearedFlags: reappeared,
    flags: nextFlags,
  });
  await postWebhook(webhookMessages, {
    webhookUrl: env.DISCORD_WEBHOOK_URL,
    fetchImpl,
    logger,
  });

  logger.log(
    `updated: ${newFlags.length} new flag(s), ${removed.length} removed flag(s), ` +
      `${Object.keys(newVersions).length} version field(s)`,
  );
  return {
    newFlags,
    newVersions,
    removed,
    reappeared,
    flagAnalysis,
    versionAnalysis,
    currentVersions,
    flagState: presence.state,
    snapshotChanged,
    wroteChangelog: true,
    webhookMessages,
    urls,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .then(async (result) => {
      if (process.env.GITHUB_OUTPUT) {
        await appendFile(
          process.env.GITHUB_OUTPUT,
          `snapshot_changed=${result.snapshotChanged ? 'true' : 'false'}\n`,
        );
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
