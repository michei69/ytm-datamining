import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  extractAssetUrls,
  extractScriptUrls,
  normalizeVersions,
  flagExistsInText,
  merge,
  parseYtcfg,
  run,
  updateFlagPresence,
} from './check.mjs';
import {
  applyFlagMetadata,
  buildSourceIndex,
  diffAssets,
  findFlagAnalysisTargets,
  runFlagHarness,
  searchSources,
  validateFlagSubmission,
  validateVersionSubmission,
} from './lib/analysis.mjs';
import { buildChangelogEntry, makeWebhookMessages, prependChangelogEntry } from './lib/changelog.mjs';
import { OpenAIHarness, readModelConfig } from './lib/openai-harness.mjs';
import { loadSnapshot, saveSnapshot } from './lib/snapshot.mjs';

const cfg = {
  EXPERIMENT_FLAGS: { zeta: true, alpha: false },
  INNERTUBE_CLIENT_VERSION: '1.2',
  PLAYER_CLIENT_VERSION: '1.1',
  NESTED: { x: '}"{' },
};
const html = `<script>ytcfg.set({"OTHER":1});</script><script>ytcfg.set(${JSON.stringify(cfg)});</script>`;

test('parseYtcfg finds the payload with EXPERIMENT_FLAGS and versions', () => {
  const parsed = parseYtcfg(html);
  assert.equal(parsed.INNERTUBE_CLIENT_VERSION, '1.2');
  assert.equal(parsed.PLAYER_CLIENT_VERSION, '1.1');
  assert.deepEqual(Object.keys(parsed.EXPERIMENT_FLAGS), ['zeta', 'alpha']);
  assert.throws(() => parseYtcfg('<html></html>'), /not found/);
});

test('merge appends unseen flags and versions', () => {
  const flags = { existing: {} };
  const versions = { innertube: ['1.1'], player: ['1.0'] };
  const result = merge(flags, versions, cfg);
  assert.deepEqual(result.newFlags, ['alpha', 'zeta']);
  assert.deepEqual(result.flags, { existing: {}, alpha: {}, zeta: {} });
  assert.deepEqual(result.newVersions, { innertube: '1.2', player: '1.1' });
  assert.deepEqual(result.previousVersions, { innertube: '1.1', player: '1.0' });
  assert.deepEqual(result.versions, {
    innertube: ['1.1', '1.2'],
    player: ['1.0', '1.1'],
    current: { innertube: '1.2', player: '1.1' },
  });
});

test('merge reports nothing for known flags and versions', () => {
  const result = merge({ alpha: {}, zeta: {} }, { innertube: ['1.2'], player: ['1.1'] }, cfg);
  assert.deepEqual(result.newFlags, []);
  assert.deepEqual(result.newVersions, {});
});

test('merge detects rollbacks to versions already present in history', () => {
  const versions = {
    current: { innertube: '2.0', player: '2.0' },
    innertube: ['1.0', '2.0'],
    player: ['1.0', '2.0'],
  };
  const result = merge({}, versions, {
    EXPERIMENT_FLAGS: {},
    INNERTUBE_CLIENT_VERSION: '1.0',
    PLAYER_CLIENT_VERSION: '2.0',
  });
  assert.deepEqual(result.newVersions, { innertube: '1.0' });
  assert.deepEqual(result.currentVersions, { innertube: '1.0', player: '2.0' });
  assert.deepEqual(versions.current, { innertube: '1.0', player: '2.0' });
  assert.deepEqual(normalizeVersions({ versions: 1 }), { innertube: null, player: null });
});

test('extractAssetUrls finds the player base and Polymer bundle', () => {
  const page = `
    <script src="/s/abc123/music_polymer_inlined_html.js"></script>
    <script>ytcfg.set({"WEB_PLAYER_CONTEXT_CONFIGS":{"main":{"jsUrl":"/s/player/deadbeef/player_es6.vflset/en_US/base.js"}}})</script>`;
  const urls = extractAssetUrls(page, {
    WEB_PLAYER_CONTEXT_CONFIGS: {
      main: { jsUrl: '/s/player/deadbeef/player_es6.vflset/en_US/base.js' },
    },
  });
  assert.equal(urls.baseUrl, 'https://music.youtube.com/s/player/deadbeef/player_es6.vflset/en_US/base.js');
  assert.equal(urls.polymerUrl, 'https://music.youtube.com/s/abc123/music_polymer_inlined_html.js');
});

test('extractScriptUrls keeps only same-origin scripts', () => {
  const urls = extractScriptUrls(`
    <script src="https://www.googletagmanager.com/gtm.js?id=x"></script>
    <script src="/s/build/scheduler.js"></script>
    <script src="https://music.youtube.com/s/build/extra.js"></script>
  `);
  assert.deepEqual(urls, [
    'https://music.youtube.com/s/build/scheduler.js',
    'https://music.youtube.com/s/build/extra.js',
  ]);
});

test('flag evidence must be an exact excerpt near the flag', () => {
  const index = buildSourceIndex({ 'base.js': 'alpha F("new_flag",true) omega' });
  const targets = findFlagAnalysisTargets({ new_flag: {} });
  const submission = {
    flags: [
      {
        name: 'new_flag',
        description: 'Enables a new playback behavior for the player.',
        requires_restart: false,
        family: 'player/playback',
      },
    ],
  };
  assert.throws(() => validateFlagSubmission(submission, targets, { index }), /evidence/);
  submission.flags[0].evidence = [{ file: 'base.js', quote: 'F("new_flag",true)' }];
  assert.doesNotThrow(() => validateFlagSubmission(submission, targets, { index }));
  submission.flags[0].evidence = [{ file: 'base.js', quote: 'not in the source' }];
  assert.throws(() => validateFlagSubmission(submission, targets, { index }), /exact excerpt/);
});

test('version evidence must occur inside an added or removed diff line', () => {
  const diffText = [
    'diff --git a/base.js b/base.js',
    '--- a/base.js',
    '+++ b/base.js',
    '@@ -1 +1 @@',
    '-old behavior',
    '+new player behavior with Fresh Panel',
  ].join('\n');
  const valid = {
    summary: 'The player gained a fresh panel.',
    changes: [
      {
        title: 'Fresh panel',
        description: 'A fresh panel is displayed in the player.',
        evidence: [{ quote: 'new player behavior with Fresh Panel' }],
      },
    ],
  };
  assert.doesNotThrow(() => validateVersionSubmission(valid, { diffText }));
  assert.throws(() => validateVersionSubmission(valid, { diffText: diffText.replace('Fresh Panel', 'Old Panel') }), /added or removed source line/);
  const missing = structuredClone(valid);
  delete missing.changes[0].evidence;
  assert.throws(() => validateVersionSubmission(missing, { diffText }), /evidence/);
});

test('search tool options are clamped and unsafe regexes are rejected', () => {
  const index = buildSourceIndex({ 'base.js': `${'x'.repeat(10_000)} target ${'y'.repeat(10_000)}` });
  const result = searchSources(index, 'target', { contextChars: 999_999, maxHits: 999 });
  assert.ok(result.results[0].snippet.length <= 8_100);
  assert.throws(() => searchSources(index, '(a+)+$', { regex: true }), /unsafe/);
});

test('corrupt snapshots are treated as a missing baseline', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ytm-corrupt-snapshot-'));
  try {
    await writeFile(join(dir, 'manifest.json'), '{not json');
    let warned = false;
    const snapshot = await loadSnapshot(dir, { logger: { warn: () => { warned = true; } } });
    assert.equal(snapshot, null);
    assert.equal(warned, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('flag existence uses identifier boundaries', () => {
  assert.equal(flagExistsInText('F("flag_one",!0)', 'flag_one'), true);
  assert.equal(flagExistsInText('F("flag_one_extra",!0)', 'flag_one'), false);
  assert.equal(flagExistsInText('const my_flag_one = 1', 'flag_one'), false);
});

test('flag removal requires repeated consecutive misses and sightings reset the counter', () => {
  const flags = {
    still_here: { description: 'x' },
    gone: { description: 'x' },
    back_again: { description: 'x', removed: true },
  };
  const state = { version: 1, flags: {} };
  const sources = ['F("still_here");F("back_again")'];

  const first = updateFlagPresence(flags, state, sources, [], {
    timestamp: '2026-10-22T00:00:00Z',
    removalMisses: 3,
  });
  assert.deepEqual(first.removed, []);
  assert.deepEqual(first.reappeared, ['back_again']);
  assert.equal(state.flags.gone.consecutiveMisses, 1);
  assert.equal(flags.gone.removed, undefined);

  const second = updateFlagPresence(flags, state, sources, [], {
    timestamp: '2026-10-22T12:00:00Z',
    removalMisses: 3,
  });
  assert.deepEqual(second.removed, []);

  const third = updateFlagPresence(flags, state, sources, [], {
    timestamp: '2026-10-23T00:00:00Z',
    removalMisses: 3,
  });
  assert.deepEqual(third.removed, ['gone']);
  assert.equal(flags.gone.removed, true);
  assert.equal(state.flags.gone, undefined);

  // Any sighting clears the removed marker and leaves no miss state behind.
  flags.gone.removed = false;
  updateFlagPresence(flags, state, [...sources, 'F("gone")'], [], {
    timestamp: '2026-10-23T12:00:00Z',
    removalMisses: 3,
  });
  assert.equal(state.flags.gone, undefined);
});

test('findFlagAnalysisTargets only selects incomplete, non-removed flags', () => {
  const targets = findFlagAnalysisTargets({
    complete: { description: 'A complete description of behavior.', requires_restart: false, family: 'misc' },
    missing_family: { description: 'A complete description of behavior.', requires_restart: true },
    new_flag: {},
    removed: { description: 'Old behavior.', requires_restart: false, family: 'misc', removed: true },
  });
  assert.deepEqual(
    targets.map(({ name, requiredFields }) => ({ name, requiredFields })),
    [
      { name: 'missing_family', requiredFields: ['family'] },
      { name: 'new_flag', requiredFields: ['description', 'requires_restart', 'family'] },
    ],
  );
});

test('flag metadata application never overwrites an existing description', () => {
  const flags = {
    existing: { description: 'Existing behavior.', requires_restart: false },
    fresh: {},
  };
  const targets = findFlagAnalysisTargets(flags);
  const result = validateFlagSubmission(
    {
      flags: [
        {
          name: 'existing',
          description: 'Existing behavior.',
          family: 'player/playback',
        },
        {
          name: 'fresh',
          description: 'Enables a new playback queue behavior when the player is reopened.',
          requires_restart: true,
          family: 'player/playback',
        },
      ],
    },
    targets,
  );
  applyFlagMetadata(flags, result.flags);
  assert.equal(flags.existing.description, 'Existing behavior.');
  assert.equal(flags.existing.family, 'player/playback');
  assert.deepEqual(flags.fresh, {
    description: 'Enables a new playback queue behavior when the player is reopened.',
    requires_restart: true,
    family: 'player/playback',
  });
  assert.throws(
    () =>
      validateFlagSubmission(
        { flags: [{ name: 'existing', description: 'A rewritten description.', family: 'misc' }] },
        findFlagAnalysisTargets({ existing: { description: 'Existing behavior.', requires_restart: false } }),
      ),
    /immutable/,
  );
});

test('prose validation rejects transient code references', () => {
  assert.throws(
    () =>
      validateFlagSubmission(
        {
          flags: [
            {
              name: 'fresh',
              description: 'According to function abc(), this changes the player.',
              requires_restart: false,
              family: 'player/playback',
            },
          ],
        },
        findFlagAnalysisTargets({ fresh: {} }),
      ),
    /according to/,
  );
  assert.throws(
    () => validateVersionSubmission({ summary: 'As seen from x.y(), behavior changed.', changes: [] }),
    /refers back|names a dotted call/i,
  );
});

test('searchSources returns bounded snippets and line numbers', () => {
  const index = buildSourceIndex({
    'base.js': 'line one\nconst FEATURE_FLAG = true;\nline three',
    'polymer.js': 'nothing here',
  });
  const result = searchSources(index, 'FEATURE_FLAG', { contextChars: 5 });
  assert.equal(result.count, 1);
  assert.equal(result.results[0].file, 'base.js');
  assert.equal(result.results[0].line, 2);
  assert.match(result.results[0].snippet, /FEATURE_FLAG/);
});

test('diffAssets produces a unified diff for changed assets', async () => {
  const diff = await diffAssets(
    { base: 'old player behavior\n', polymer: 'same polymer\n' },
    { base: 'new player behavior\n', polymer: 'same polymer\n' },
  );
  assert.match(diff, /base\.js/);
  assert.match(diff, /-old player behavior/);
  assert.match(diff, /\+new player behavior/);
  assert.doesNotMatch(diff, /same polymer/);
});

test('changelog entries include added and removed flags and version analysis', () => {
  const entry = buildChangelogEntry({
    timestamp: new Date('2026-10-22T12:34:56.000Z'),
    newVersions: { innertube: '2.0' },
    previousVersions: { innertube: '1.0', player: '1.0' },
    versionAnalysis: { summary: 'Playback controls changed.', changes: [{ title: 'Controls', description: 'A new control is shown.' }] },
    newFlagNames: ['new_flag'],
    removedFlags: ['old_flag'],
    flags: { new_flag: { description: 'Turns on the new behavior.', requires_restart: true, family: 'player/playback' } },
  });
  assert.match(entry, /2026-10-22 12:34:56 UTC/);
  assert.match(entry, /INNERTUBE_CLIENT_VERSION/);
  assert.match(entry, /`new_flag`/);
  assert.match(entry, /requires restart: yes/);
  assert.match(entry, /`old_flag`/);
  assert.match(entry, /Playback controls changed/);

  const merged = prependChangelogEntry('# Changelog\n\nold entry\n', entry);
  assert.match(merged, /^# Changelog/);
  assert.ok(merged.indexOf('new_flag') < merged.indexOf('old entry'));
  const messages = makeWebhookMessages({
    newVersions: { innertube: '2.0' },
    previousVersions: { innertube: '1.0', player: null },
    versionAnalysis: { summary: 'Playback controls changed.', changes: [] },
    newFlagNames: ['new_flag'],
    flags: { new_flag: { description: 'Turns on the new behavior.', requires_restart: false, family: 'player/playback' } },
  });
  assert.ok(messages.length > 0);
  assert.ok(messages.every((message) => message.length <= 2_000));
});

test('readModelConfig expands OPENAI_BASE_URL to a chat completions URL', () => {
  const config = readModelConfig({
    OPENAI_BASE_URL: 'https://endpoint.example/v1',
    OPENAI_API_KEY: 'key',
    OPENAI_MODEL: 'model',
  });
  assert.equal(config.endpoint, 'https://endpoint.example/v1/chat/completions');
});

test('runFlagHarness batches flags and splits failed batches on the same harness instance', async () => {
  const names = ['flag_a', 'flag_b', 'flag_c', 'flag_d', 'flag_e', 'flag_f'];
  const targets = names.map((name) => ({ name, value: {}, requiredFields: ['description'] }));
  const flags = Object.fromEntries(names.map((name) => [name, {}]));
  const calls = [];
  const harness = {
    async run({ user }) {
      const batch = names.filter((name) => user.includes(`"name": "${name}"`));
      calls.push(batch);
      if (calls.length === 1) throw new Error('simulated overlong batch');
      return {
        flags: Object.fromEntries(
          batch.map((name) => [
            name,
            {
              description: `Description for ${name} behavior.`,
              requires_restart: false,
              family: 'misc',
            },
          ]),
        ),
      };
    },
  };
  const result = await runFlagHarness({
    harness,
    flags,
    targets,
    sources: { 'base.js': names.map((name) => `F("${name}")`).join(';') },
    runtimeFlags: {},
    logger: { log() {}, warn() {} },
    batchSize: 4,
  });
  assert.deepEqual(calls.map((batch) => batch.length), [4, 2, 2, 2]);
  assert.deepEqual(Object.keys(result.flags).sort(), names);
});

test('OpenAIHarness executes tools and submits a validated result', async () => {
  const requests = [];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body.messages);
    if (requests.length === 1) {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call-1',
                    type: 'function',
                    function: { name: 'lookup', arguments: JSON.stringify({ value: 'abc' }) },
                  },
                ],
              },
            },
          ],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call-2',
                  type: 'function',
                  function: {
                    name: 'submit',
                    arguments: JSON.stringify({ answer: 'abc-found' }),
                  },
                },
              ],
            },
          },
        ],
      }),
    };
  };
  const harness = new OpenAIHarness({
    endpoint: 'https://model.example/chat/completions',
    apiKey: 'key',
    model: 'model',
    fetchImpl,
  });
  const result = await harness.run({
    system: 'system',
    user: 'user',
    tools: [
      {
        name: 'lookup',
        description: 'lookup',
        parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
        execute: ({ value }) => ({ value, found: true }),
      },
      {
        name: 'submit',
        description: 'submit',
        parameters: { type: 'object' },
      },
    ],
    submitName: 'submit',
    validate: (value) => {
      if (value.answer !== 'abc-found') throw new Error('bad answer');
      return value;
    },
  });
  assert.deepEqual(result, { answer: 'abc-found' });
  assert.match(JSON.stringify(requests[1]), /abc/);
});

function fakeResponse({ body = '', json = null, status = 200, ok = true } = {}) {
  return {
    ok,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => json ?? JSON.parse(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function pageHtml(experimentFlags, innertube, player) {
  const config = {
    EXPERIMENT_FLAGS: experimentFlags,
    INNERTUBE_CLIENT_VERSION: innertube,
    PLAYER_CLIENT_VERSION: player,
    WEB_PLAYER_CONTEXT_CONFIGS: {
      main: { jsUrl: '/s/player/hash/player_es6.vflset/en_US/base.js' },
    },
  };
  return `<script src="/s/abc123/music_polymer_inlined_html.js"></script><script>ytcfg.set(${JSON.stringify(config)});</script>`;
}

test('run does not use the model or webhook when nothing changed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ytm-run-none-'));
  try {
    const flags = {
      existing: {
        description: 'Controls an existing playback behavior.',
        requires_restart: false,
        family: 'player/playback',
      },
    };
    await writeFile(join(root, 'flags.json'), JSON.stringify(flags));
    await writeFile(join(root, 'versions.json'), JSON.stringify({ innertube: ['2.0'], player: ['1.0'] }));
    const snapshotDir = join(root, '.cache');
    await saveSnapshot(snapshotDir, {
      base: 'F("existing");',
      polymer: 'Polymer content',
      versions: { innertube: '2.0', player: '1.0' },
      fetchedAt: '2026-10-21T00:00:00.000Z',
    });
    const page = pageHtml({ existing: true }, '2.0', '1.0');
    let modelCalls = 0;
    let webhookCalls = 0;
    const fetchImpl = async (url) => {
      if (url === 'https://music.youtube.com/') return fakeResponse({ body: page });
      if (String(url).endsWith('base.js')) return fakeResponse({ body: 'F("existing");' });
      if (String(url).endsWith('music_polymer_inlined_html.js')) return fakeResponse({ body: 'Polymer content' });
      if (String(url).includes('model.example')) {
        modelCalls++;
        throw new Error('model must not be called');
      }
      if (String(url).includes('discord')) {
        webhookCalls++;
        return fakeResponse();
      }
      throw new Error(`unexpected fetch ${url}`);
    };
    const result = await run({
      root,
      env: {
        DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
        YTM_SNAPSHOT_DIR: snapshotDir,
      },
      fetchImpl,
      logger: { log() {}, warn() {} },
      now: () => new Date('2026-10-22T00:00:00Z'),
    });
    assert.deepEqual(result.newFlags, []);
    assert.deepEqual(result.newVersions, {});
    assert.deepEqual(result.removed, []);
    assert.equal(result.snapshotChanged, false);
    assert.equal(modelCalls, 0);
    assert.equal(webhookCalls, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('run does not call the model for a version-only baseline with no previous diff', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ytm-run-baseline-'));
  try {
    await writeFile(
      join(root, 'flags.json'),
      JSON.stringify({
        existing: {
          description: 'Controls an existing playback behavior.',
          requires_restart: false,
          family: 'player/playback',
        },
      }),
    );
    await writeFile(
      join(root, 'versions.json'),
      JSON.stringify({
        innertube: ['1.0'],
        player: ['1.0'],
        current: { innertube: '1.0', player: '1.0' },
      }),
    );
    const page = pageHtml({ existing: true }, '2.0', '1.0');
    let modelCalls = 0;
    let webhookContent = '';
    const fetchImpl = async (url, options = {}) => {
      if (url === 'https://music.youtube.com/') return fakeResponse({ body: page });
      if (String(url).endsWith('base.js')) return fakeResponse({ body: 'F("existing");' });
      if (String(url).endsWith('music_polymer_inlined_html.js')) return fakeResponse({ body: 'Polymer content' });
      if (String(url).includes('model.example')) {
        modelCalls++;
        throw new Error('model must not be called without a previous snapshot');
      }
      if (String(url).includes('discord')) {
        webhookContent += JSON.parse(options.body).content;
        return fakeResponse();
      }
      throw new Error(`unexpected fetch ${url}`);
    };
    const result = await run({
      root,
      env: {
        DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
        YTM_SNAPSHOT_DIR: join(root, 'snapshot'),
      },
      fetchImpl,
      logger: { log() {}, warn() {} },
      now: () => new Date('2026-10-22T12:00:00Z'),
    });
    assert.equal(modelCalls, 0);
    assert.equal(result.versionAnalysis, null);
    assert.equal(result.snapshotChanged, true);
    assert.deepEqual(result.newVersions, { innertube: '2.0' });
    assert.match(webhookContent, /baseline/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('run handles removal-only events without calling the model', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ytm-run-removal-'));
  try {
    await writeFile(
      join(root, 'flags.json'),
      JSON.stringify({
        gone_flag: {
          description: 'Controls a removed behavior.',
          requires_restart: false,
          family: 'misc',
        },
      }),
    );
    await writeFile(
      join(root, 'flag-state.json'),
      JSON.stringify({
        version: 1,
        flags: {
          gone_flag: { consecutiveMisses: 2, lastMissingAt: '2026-10-21T00:00:00.000Z' },
        },
      }),
    );
    await writeFile(
      join(root, 'versions.json'),
      JSON.stringify({
        innertube: ['1.0'],
        player: ['1.0'],
        current: { innertube: '1.0', player: '1.0' },
      }),
    );
    const page = pageHtml({}, '1.0', '1.0');
    let modelCalls = 0;
    let webhookContent = '';
    const fetchImpl = async (url, options = {}) => {
      if (url === 'https://music.youtube.com/') return fakeResponse({ body: page });
      if (String(url).endsWith('base.js')) return fakeResponse({ body: 'no matching flags here' });
      if (String(url).endsWith('music_polymer_inlined_html.js')) return fakeResponse({ body: 'Polymer content' });
      if (String(url).includes('model.example')) {
        modelCalls++;
        throw new Error('removal-only runs must not call the model');
      }
      if (String(url).includes('discord')) {
        webhookContent += JSON.parse(options.body).content;
        return fakeResponse();
      }
      throw new Error(`unexpected fetch ${url}`);
    };
    const result = await run({
      root,
      env: {
        DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
        YTM_SNAPSHOT_DIR: join(root, 'snapshot'),
        FLAG_REMOVAL_MISSES: '3',
      },
      fetchImpl,
      logger: { log() {}, warn() {} },
      now: () => new Date('2026-10-22T12:00:00Z'),
    });
    assert.equal(modelCalls, 0);
    assert.deepEqual(result.removed, ['gone_flag']);
    assert.match(webhookContent, /Removed EXPERIMENT_FLAGS/);
    const savedFlags = JSON.parse(await readFile(join(root, 'flags.json'), 'utf8'));
    assert.equal(savedFlags.gone_flag.removed, true);
    const changelog = await readFile(join(root, 'changelog.md'), 'utf8');
    assert.match(changelog, /gone_flag/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('run still invokes the version harness when versions change but the tracked sources do not', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ytm-run-empty-diff-'));
  try {
    const snapshotDir = join(root, 'snapshot');
    const assets = { base: 'unchanged base F("existing");', polymer: 'unchanged polymer' };
    await saveSnapshot(snapshotDir, {
      ...assets,
      versions: { innertube: '1.0', player: '1.0' },
      fetchedAt: '2026-10-21T00:00:00.000Z',
    });
    await writeFile(
      join(root, 'flags.json'),
      JSON.stringify({
        existing: {
          description: 'Controls an existing playback behavior.',
          requires_restart: false,
          family: 'player/playback',
        },
      }),
    );
    await writeFile(
      join(root, 'versions.json'),
      JSON.stringify({
        innertube: ['1.0'],
        player: ['1.0'],
        current: { innertube: '1.0', player: '1.0' },
      }),
    );
    const page = pageHtml({ existing: true }, '2.0', '1.0');
    let versionModelCalls = 0;
    const fetchImpl = async (url, options = {}) => {
      if (url === 'https://music.youtube.com/') return fakeResponse({ body: page });
      if (String(url).endsWith('base.js')) return fakeResponse({ body: assets.base });
      if (String(url).endsWith('music_polymer_inlined_html.js')) return fakeResponse({ body: assets.polymer });
      if (String(url).includes('model.example')) {
        versionModelCalls++;
        const body = JSON.parse(options.body);
        assert.match(body.messages.map((message) => message.content || '').join('\n'), /VERSION UPDATE/);
        return fakeResponse({
          json: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'version-submit',
                      type: 'function',
                      function: {
                        name: 'submit_version_analysis',
                        arguments: JSON.stringify({
                          summary: 'The version changed, but the tracked base.js and Polymer bundle are unchanged.',
                          changes: [],
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          },
        });
      }
      if (String(url).includes('discord')) return fakeResponse();
      throw new Error(`unexpected fetch ${url}`);
    };
    const result = await run({
      root,
      env: {
        OPENAI_COMPLETIONS_URL: 'https://model.example/chat/completions',
        OPENAI_API_KEY: 'key',
        OPENAI_MODEL: 'model',
        DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
        YTM_SNAPSHOT_DIR: snapshotDir,
      },
      fetchImpl,
      logger: { log() {}, warn() {} },
      now: () => new Date('2026-10-22T12:00:00Z'),
    });
    assert.equal(versionModelCalls, 1);
    assert.match(result.versionAnalysis.summary, /tracked base\.js and Polymer bundle are unchanged/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('run uses two concurrent harness instances and records both kinds of changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ytm-run-both-'));
  try {
    const snapshotDir = join(root, 'snapshot');
    const oldAssets = { base: 'old base behavior F("old_flag");', polymer: 'old polymer element' };
    await saveSnapshot(snapshotDir, {
      ...oldAssets,
      versions: { innertube: ['1.0'], player: ['0.9'] },
      fetchedAt: '2026-10-21T00:00:00.000Z',
    });
    await writeFile(
      join(root, 'flags.json'),
      JSON.stringify(
        {
          old_flag: {
            description: 'Controls an older behavior.',
            requires_restart: false,
            family: 'misc',
          },
        },
        null,
        2,
      ),
    );
    await writeFile(join(root, 'versions.json'), JSON.stringify({ innertube: ['1.0'], player: ['0.9'] }));

    const newAssets = {
      base: 'new base behavior F("fresh_flag");',
      polymer: '<ytm-new-panel>Fresh controls</ytm-new-panel>',
    };
    const page = pageHtml({ old_flag: true, fresh_flag: true }, '2.0', '1.0');
    let activeModelCalls = 0;
    let maxConcurrentModelCalls = 0;
    const modelBodies = [];
    let webhookContent = '';

    const fetchImpl = async (url, options = {}) => {
      if (url === 'https://music.youtube.com/') return fakeResponse({ body: page });
      if (String(url).endsWith('base.js')) return fakeResponse({ body: newAssets.base });
      if (String(url).endsWith('music_polymer_inlined_html.js')) return fakeResponse({ body: newAssets.polymer });
      if (String(url).includes('model.example')) {
        const body = JSON.parse(options.body);
        modelBodies.push(body);
        activeModelCalls++;
        maxConcurrentModelCalls = Math.max(maxConcurrentModelCalls, activeModelCalls);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
        activeModelCalls--;
        const userText = body.messages.map((message) => message.content || '').join('\n');
        if (userText.includes('FEATURE FLAG RULES')) {
          return fakeResponse({
            json: {
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: null,
                    tool_calls: [
                      {
                        id: 'flag-submit',
                        type: 'function',
                        function: {
                          name: 'submit_flag_metadata',
                          arguments: JSON.stringify({
                            flags: [
                              {
                                name: 'fresh_flag',
                                description: 'Adds a fresh controls panel for controlling playback behavior.',
                                requires_restart: true,
                                family: 'player/playback',
                                evidence: [
                                  {
                                    file: 'base.js',
                                    offset: 0,
                                    quote: 'new base behavior F("fresh_flag");',
                                  },
                                ],
                              },
                            ],
                          }),
                        },
                      },
                    ],
                  },
                },
              ],
            },
          });
        }
        assert.match(userText, /VERSION UPDATE/);
        return fakeResponse({
          json: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'version-submit',
                      type: 'function',
                      function: {
                        name: 'submit_version_analysis',
                        arguments: JSON.stringify({
                          summary: 'The player gained a fresh controls panel.',
                          changes: [
                            {
                              title: 'Playback controls',
                              description: 'A fresh controls panel is now available for playback.',
                              evidence: [{ quote: 'new base behavior F("fresh_flag");' }],
                            },
                          ],
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          },
        });
      }
      if (String(url).includes('discord')) {
        webhookContent += JSON.parse(options.body).content + '\n';
        return fakeResponse();
      }
      throw new Error(`unexpected fetch ${url}`);
    };

    const result = await run({
      root,
      env: {
        OPENAI_COMPLETIONS_URL: 'https://model.example/chat/completions',
        OPENAI_API_KEY: 'key',
        OPENAI_MODEL: 'model',
        DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
        YTM_SNAPSHOT_DIR: snapshotDir,
      },
      fetchImpl,
      logger: { log() {}, warn() {} },
      now: () => new Date('2026-10-22T12:00:00Z'),
    });

    assert.equal(maxConcurrentModelCalls, 2);
    assert.equal(modelBodies.length, 2);
    assert.deepEqual(result.newFlags, ['fresh_flag']);
    assert.deepEqual(result.newVersions, { innertube: '2.0', player: '1.0' });
    assert.match(webhookContent, /New EXPERIMENT_FLAGS/);
    assert.match(webhookContent, /fresh controls panel/);
    assert.match(webhookContent, /Client version update/);

    const savedFlags = JSON.parse(await readFile(join(root, 'flags.json'), 'utf8'));
    assert.deepEqual(savedFlags.fresh_flag, {
      description: 'Adds a fresh controls panel for controlling playback behavior.',
      requires_restart: true,
      family: 'player/playback',
    });
    const savedVersions = JSON.parse(await readFile(join(root, 'versions.json'), 'utf8'));
    assert.deepEqual(savedVersions, {
      innertube: ['1.0', '2.0'],
      player: ['0.9', '1.0'],
      current: { innertube: '2.0', player: '1.0' },
    });
    const changelog = await readFile(join(root, 'changelog.md'), 'utf8');
    assert.match(changelog, /fresh_flag/);
    assert.match(changelog, /fresh controls panel/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
