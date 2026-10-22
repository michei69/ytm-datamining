import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const PROSE_RULES = `
You are analyzing minified, versioned YouTube Music client code. The code changes
shape between builds, so minified function names, local variable names, method
names, and line numbers are NOT stable evidence. Never write phrases such as
"according to function abc()", "as seen in x.y()", or descriptions of a helper
that only make sense for this build. Refer only to stable things such as user-
visible labels, element/component names, custom element names, public request or
response field names, CSS custom properties, and stable identifiers named like
YTM_whatever. If the evidence only supports an internal mechanism, say so in
plain behavior terms rather than naming transient code.
`.trim();

const BANNED_PROSE = [
  { re: /\baccording to\b/i, label: 'mentions "according to"' },
  { re: /\bas (?:seen|shown|evidenced) (?:from|in|by)\b/i, label: 'refers back to code by sight' },
  { re: /\b(?:function|method|routine)\s+[A-Za-z_$][\w$]*/i, label: 'names a function or method' },
  { re: /\b[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\s*\(/i, label: 'names a dotted call expression' },
  { re: /\b[A-Za-z_$][\w$]*\s*\(\s*["'`]/, label: 'names a function call with a string literal' },
  { re: /\b(?:minified|obfuscated|source code)\b/i, label: 'talks about minified/source code instead of behavior' },
];

function validateLabel(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${fieldName} must be a non-empty string`);
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length > 120) throw new Error(`${fieldName} is too long`);
  for (const { re, label } of BANNED_PROSE) {
    if (re.test(text)) throw new Error(`${fieldName} ${label}; use stable behavior terms instead`);
  }
  return text;
}

export function validateProse(value, fieldName = 'text') {
  if (typeof value !== 'string') throw new Error(`${fieldName} must be a string`);
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 15) throw new Error(`${fieldName} is too short to explain behavior`);
  if (text.length > 1_000) throw new Error(`${fieldName} is too long`);
  for (const { re, label } of BANNED_PROSE) {
    if (re.test(text)) throw new Error(`${fieldName} ${label}; describe observable behavior instead`);
  }
  return text;
}

function lineStartsFor(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function lineNumberFor(starts, offset) {
  let lo = 0;
  let hi = starts.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (starts[mid] <= offset) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function buildSourceIndex(sources) {
  const index = new Map();
  for (const [name, text] of Object.entries(sources)) {
    if (typeof text !== 'string') continue;
    index.set(name, { name, text, lineStarts: lineStartsFor(text) });
  }
  return index;
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

export function searchSources(index, query, options = {}) {
  const regex = Boolean(options.regex);
  const caseSensitive = options.caseSensitive !== false;
  const contextChars = clampInteger(options.contextChars, 900, 50, 4_000);
  const maxHits = clampInteger(options.maxHits, 6, 1, 20);
  const maxFiles = clampInteger(options.maxFiles, 20, 1, 20);
  if (typeof query !== 'string' || query.length < 2) throw new Error('query must contain at least two characters');
  if (query.length > 300) throw new Error('query is too long');
  if (regex && (/\\[1-9]/.test(query) || /\([^)]*[+*][^)]*\)[+*{]/.test(query))) {
    throw new Error('regex uses a potentially unsafe backreference or nested quantifier');
  }

  const matcher = regex
    ? new RegExp(query, caseSensitive ? 'g' : 'gi')
    : null;
  const needle = caseSensitive ? query : query.toLowerCase();
  const results = [];
  let filesSearched = 0;

  for (const file of index.values()) {
    if (filesSearched >= maxFiles || results.length >= maxHits) break;
    filesSearched++;
    const haystack = caseSensitive ? file.text : file.text.toLowerCase();
    let position = 0;
    while (results.length < maxHits) {
      let found = -1;
      let matchText = query;
      if (matcher) {
        matcher.lastIndex = position;
        const match = matcher.exec(file.text);
        if (match) {
          found = match.index;
          matchText = match[0];
        }
      } else {
        found = haystack.indexOf(needle, position);
      }
      if (found === -1) break;

      const start = Math.max(0, found - contextChars);
      const end = Math.min(file.text.length, found + matchText.length + contextChars);
      const snippet = file.text.slice(start, end);
      results.push({
        file: file.name,
        offset: found,
        line: lineNumberFor(file.lineStarts, found),
        snippet,
        snippetStart: start,
        snippetEnd: end,
      });
      position = found + Math.max(1, matchText.length);
    }
  }

  return {
    query,
    count: results.length,
    results,
  };
}

export function readSourceRange(index, { file, offset = 0, length = 12_000 }) {
  const source = index.get(file);
  if (!source) {
    throw new Error(`Unknown source file: ${file}. Available: ${[...index.keys()].join(', ')}`);
  }
  const safeOffset = Math.max(0, Math.min(source.text.length, Number(offset) || 0));
  const safeLength = Math.max(1, Math.min(24_000, Number(length) || 12_000));
  const end = Math.min(source.text.length, safeOffset + safeLength);
  return {
    file,
    offset: safeOffset,
    end,
    text: source.text.slice(safeOffset, end),
  };
}

export function makeSourceTools(index) {
  return [
    {
      name: 'search_source',
      description:
        'Search the downloaded client files and/or generated diff for a literal or regular expression. Returns bounded snippets with offsets and line numbers.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Literal text or regular expression to search for.' },
          regex: { type: 'boolean', description: 'Treat query as a JavaScript regular expression.' },
          case_sensitive: { type: 'boolean', description: 'Whether the search is case-sensitive. Defaults to true.' },
          context_chars: { type: 'integer', minimum: 50, maximum: 4000, description: 'Characters of context on each side.' },
          max_hits: { type: 'integer', minimum: 1, maximum: 20, description: 'Maximum snippets to return.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      execute: (args) =>
        searchSources(index, args.query, {
          regex: Boolean(args.regex),
          caseSensitive: args.case_sensitive !== false,
          contextChars: args.context_chars,
          maxHits: args.max_hits,
        }),
    },
    {
      name: 'read_source',
      description: 'Read a bounded range from one of the indexed source files after locating an offset with search_source.',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Exact file name returned by search_source.' },
          offset: { type: 'integer', minimum: 0 },
          length: { type: 'integer', minimum: 1, maximum: 24000 },
        },
        required: ['file', 'offset'],
        additionalProperties: false,
      },
      execute: (args) => readSourceRange(index, args),
    },
  ];
}

function hasUsableDescription(value) {
  return typeof value?.description === 'string' && value.description.trim().length > 0;
}

function hasUsableRequiresRestart(value) {
  return typeof value?.requires_restart === 'boolean';
}

function hasUsableFamily(value) {
  return typeof value?.family === 'string' && value.family.trim().length > 0;
}

export function findFlagAnalysisTargets(flags) {
  const targets = [];
  for (const [name, value] of Object.entries(flags)) {
    if (!value || typeof value !== 'object' || value.removed === true) continue;
    const requiredFields = [];
    if (!hasUsableDescription(value)) requiredFields.push('description');
    if (!hasUsableRequiresRestart(value)) requiredFields.push('requires_restart');
    if (!hasUsableFamily(value)) requiredFields.push('family');
    if (requiredFields.length > 0) targets.push({ name, value, requiredFields });
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name));
}

function flagObservations(flags) {
  return Object.fromEntries(
    Object.entries(flags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => [
        name,
        {
          runtimeValueType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
          runtimeValue: JSON.stringify(value)?.slice(0, 240) ?? String(value),
        },
      ]),
  );
}

function buildFlagEvidence(index, targets, maxChars = 65_000) {
  const blocks = [];
  let used = 0;
  for (const target of targets) {
    const best = searchSources(index, target.name, {
      contextChars: 750,
      maxHits: 3,
      maxFiles: 20,
    }).results;
    const lines = [`### ${target.name}`];
    if (best.length === 0) {
      lines.push(
        'No occurrence was found in any indexed client script or the raw page config. It may be a server-side-only experiment flag; do not invent client behavior that has no evidence.',
      );
    } else {
      for (const hit of best) {
        lines.push(`Evidence from ${hit.file} at offset ${hit.offset}:`);
        lines.push(hit.snippet);
      }
    }
    const block = lines.join('\n');
    if (used + block.length > maxChars) {
      blocks.push('Further flag evidence was omitted to stay within the prompt budget. Use search_source for additional evidence.');
      break;
    }
    blocks.push(block);
    used += block.length;
  }
  return blocks.join('\n\n');
}

function flagHits(index, flag) {
  if (!index) return [];
  return searchSources(index, flag, {
    contextChars: 3_000,
    maxHits: 20,
    maxFiles: 20,
  }).results;
}

function validateSourceEvidence(evidence, { index, allowedHits, label }) {
  if (!Array.isArray(evidence)) throw new Error(`${label}.evidence must be an array`);
  if (evidence.length > 6) throw new Error(`${label}.evidence has too many items`);
  for (let itemIndex = 0; itemIndex < evidence.length; itemIndex++) {
    const item = evidence[itemIndex];
    if (!item || typeof item !== 'object') throw new Error(`${label}.evidence[${itemIndex}] must be an object`);
    if (typeof item.file !== 'string' || !index.has(item.file)) {
      throw new Error(`${label}.evidence[${itemIndex}].file must name an indexed source file`);
    }
    const quote = item.quote;
    if (typeof quote !== 'string' || quote.length < 8 || quote.length > 500) {
      throw new Error(`${label}.evidence[${itemIndex}].quote must be an exact 8-500 character source excerpt`);
    }
    const source = index.get(item.file);
    if (!source.text.includes(quote)) {
      throw new Error(`${label}.evidence[${itemIndex}].quote is not an exact excerpt from ${item.file}`);
    }
    if (allowedHits && !allowedHits.some((hit) => hit.file === item.file && hit.snippet.includes(quote))) {
      throw new Error(`${label}.evidence[${itemIndex}].quote is not from the context around the claimed flag`);
    }
  }
  return evidence.map((item) => ({ file: item.file, offset: Number(item.offset) || 0, quote: item.quote }));
}

const FLAG_SUBMIT_SCHEMA = {
  type: 'object',
  properties: {
    flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          requires_restart: { type: 'boolean' },
          family: { type: 'string' },
          evidence: {
            type: 'array',
            description: 'Exact source excerpts proving the behavior. Cite the flag occurrence when it exists in a source.',
            items: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                offset: { type: 'integer' },
                quote: { type: 'string' },
              },
              required: ['file', 'quote'],
              additionalProperties: false,
            },
          },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  required: ['flags'],
  additionalProperties: false,
};

function valuesByFlagName(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('submission must be a JSON object');
  const entries = Array.isArray(raw.flags)
    ? raw.flags
    : raw.flags && typeof raw.flags === 'object'
      ? Object.entries(raw.flags).map(([name, value]) => ({ name, ...value }))
      : null;
  if (!entries) throw new Error('submission must contain a flags array');
  const result = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') {
      throw new Error('every flag submission needs a name');
    }
    if (result.has(entry.name)) throw new Error(`duplicate metadata for ${entry.name}`);
    result.set(entry.name, entry);
  }
  return result;
}

export function validateFlagSubmission(raw, targets, { index = null, requireEvidence = Boolean(index) } = {}) {
  const submitted = valuesByFlagName(raw);
  const targetByName = new Map(targets.map((target) => [target.name, target]));
  const patch = {};

  for (const name of submitted.keys()) {
    if (!targetByName.has(name)) throw new Error(`submission included unexpected flag ${name}`);
  }

  for (const target of targets) {
    const entry = submitted.get(target.name);
    if (!entry) throw new Error(`missing metadata for ${target.name}`);
    const output = {};

    for (const field of target.requiredFields) {
      if (field === 'description') output.description = validateProse(entry.description, `${target.name}.description`);
      if (field === 'requires_restart') {
        if (typeof entry.requires_restart !== 'boolean') {
          throw new Error(`${target.name}.requires_restart must be a boolean`);
        }
        output.requires_restart = entry.requires_restart;
      }
      if (field === 'family') {
        const family = validateLabel(entry.family, `${target.name}.family`);
        if (family.length < 2 || family.length > 80) throw new Error(`${target.name}.family has an invalid length`);
        output.family = family;
      }
    }

    const hits = flagHits(index, target.name);
    if (requireEvidence && hits.length > 0) {
      if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
        throw new Error(`${target.name}.evidence requires at least one exact cited excerpt near the flag`);
      }
    }
    if (Array.isArray(entry.evidence) && entry.evidence.length > 0) {
      validateSourceEvidence(entry.evidence, {
        index,
        allowedHits: hits,
        label: target.name,
      });
    }

    // An existing description is immutable. Reject an attempted rewrite rather
    // than silently accepting it, so the failure is visible to the model and logs.
    if (
      hasUsableDescription(target.value) &&
      typeof entry.description === 'string' &&
      entry.description.trim() !== target.value.description.trim()
    ) {
      throw new Error(`${target.name}.description is immutable because it already exists`);
    }

    patch[target.name] = output;
  }

  return { flags: patch };
}

export function applyFlagMetadata(flags, patch) {
  if (!patch || typeof patch !== 'object') return flags;
  for (const [name, additions] of Object.entries(patch)) {
    if (!Object.hasOwn(flags, name) || !additions || typeof additions !== 'object') continue;
    const current = flags[name];
    const currentHasField = {
      description: hasUsableDescription(current),
      requires_restart: hasUsableRequiresRestart(current),
      family: hasUsableFamily(current),
    };
    for (const field of ['description', 'requires_restart', 'family']) {
      if (!Object.hasOwn(additions, field)) continue;
      if (currentHasField[field]) continue;
      current[field] = additions[field];
    }
  }
  return flags;
}

export function buildFlagPrompt({ targets, flags, index, runtimeFlags = {} }) {
  const families = [
    ...new Set(
      Object.values(flags)
        .map((flag) => flag?.family)
        .filter((family) => typeof family === 'string' && family.trim()),
    ),
  ].sort();
  const targetDescription = targets.map((target) => ({
    name: target.name,
    existingMetadata: target.value,
    requiredFields: target.requiredFields,
    immutableFields: hasUsableDescription(target.value) ? ['description'] : [],
  }));
  const observations = flagObservations(
    Object.fromEntries(targets.map((target) => [target.name, runtimeFlags[target.name]])),
  );

  return `Analyze feature/experiment flags for the current YouTube Music web client.

FEATURE FLAG RULES
- Return metadata only for the listed target flags. Do not return metadata for any other flag.
- requiredFields is exact. Fill those missing fields. Never rewrite a field listed in immutableFields.
- descriptions must explain the actual behavior controlled by the flag. Do not merely restate the flag name.
- requires_restart means a full page/client restart is needed for the setting to take effect, not whether a code path runs at startup.
- family is a short category label. Prefer an existing family from this list when it fits: ${families.join(', ')}.
- Runtime values come from ytcfg and may be booleans, numbers, strings, arrays, or objects.
- If a flag is only present in server config and has no client-side implementation in the evidence, say it is a server-side experiment/config flag with no observable client behavior rather than inventing UI details.
- Search the source as needed. Prefer stable element names, labels, API field names, and behavior. Follow the prose rules.
- The surrounding evidence below is already supplied. Use search_source only when that evidence is genuinely insufficient; do not search once per flag just to confirm what is already shown.
- Every flag that appears in an indexed source must include at least one evidence item. Copy an EXACT excerpt from the returned snippet; do not paraphrase inside quote. Evidence is for validation and is never published.
- If no occurrence exists anywhere, use an empty evidence array and be explicit that only server-side configuration evidence exists.

TARGET FLAGS
${JSON.stringify(targetDescription, null, 2)}

OBSERVED RUNTIME VALUES
${JSON.stringify(observations, null, 2)}

SURROUNDING SOURCE EVIDENCE
${buildFlagEvidence(index, targets)}

${PROSE_RULES}

When done, call submit_flag_metadata with:
{"flags":[{"name":"flag_name","description":"...","requires_restart":false,"family":"...","evidence":[{"file":"base.js","offset":123,"quote":"exact excerpt from the source"}]}]}`;
}

export function makeFlagSubmitTool() {
  return {
    name: 'submit_flag_metadata',
    description: 'Submit the final metadata for every target flag. This ends the analysis.',
    parameters: FLAG_SUBMIT_SCHEMA,
  };
}

export async function runFlagHarness({
  harness,
  flags,
  targets,
  sources,
  runtimeFlags = {},
  logger = console,
  batchSize = 4,
}) {
  const index = buildSourceIndex(sources);
  const tools = [...makeSourceTools(index), makeFlagSubmitTool()];
  logger.log(
    `flag harness: analyzing ${targets.length} flag(s) in batches of ${batchSize} with ${Object.keys(sources).length} source file(s)`,
  );

  const analyzeBatch = async (batch) => {
    logger.log(`flag harness: batch [${batch.map((target) => target.name).join(', ')}]`);
    try {
      return await harness.run({
        system:
          'You are a precise reverse-engineering analyst. You inspect minified client code and return evidence-based experiment-flag metadata as JSON. Never invent unsupported behavior.',
        user: buildFlagPrompt({ targets: batch, flags, index, runtimeFlags }),
        tools,
        submitName: 'submit_flag_metadata',
        validate: (raw) => validateFlagSubmission(raw, batch, { index }),
      });
    } catch (error) {
      if (batch.length <= 1) throw error;
      const midpoint = Math.ceil(batch.length / 2);
      logger.warn(
        `flag harness: batch failed (${error.message}); splitting into ${midpoint} + ${batch.length - midpoint} flag(s)`,
      );
      const left = await analyzeBatch(batch.slice(0, midpoint));
      const right = await analyzeBatch(batch.slice(midpoint));
      return { flags: { ...left.flags, ...right.flags } };
    }
  };

  const merged = { flags: {} };
  const size = Math.max(1, Math.min(8, Number(batchSize) || 4));
  for (let start = 0; start < targets.length; start += size) {
    const result = await analyzeBatch(targets.slice(start, start + size));
    Object.assign(merged.flags, result.flags);
  }
  return merged;
}

function previewText(text, maxChars = 75_000) {
  if (text.length <= maxChars) return text;
  const head = Math.floor(maxChars * 0.72);
  const tail = maxChars - head;
  return `${text.slice(0, head)}\n\n...[middle of diff omitted; use search_source/search the change.diff index]...\n\n${text.slice(-tail)}`;
}

export function validateVersionSubmission(
  raw,
  { diffText = '', requireEvidence = Boolean(diffText.trim()) } = {},
) {
  if (!raw || typeof raw !== 'object') throw new Error('submission must be a JSON object');
  const summary = validateProse(raw.summary, 'summary');
  if (!Array.isArray(raw.changes)) throw new Error('changes must be an array');
  if (raw.changes.length > 12) throw new Error('changes must contain at most 12 items');
  if (diffText.trim() && raw.changes.length === 0) {
    throw new Error('the diff is non-empty, so changes must contain at least one item');
  }
  if (!diffText.trim() && raw.changes.length > 0) {
    throw new Error('the diff is empty, so changes must be empty; describe the unchanged tracked files in summary');
  }

  const changedContent = diffText
    .split('\n')
    .filter((line) => /^[+-]/.test(line) && !/^(?:\+\+\+|---)/.test(line))
    .map((line) => line.slice(1))
    .join('\n');

  const changes = raw.changes.map((change, index) => {
    if (typeof change === 'string') {
      throw new Error(
        `changes[${index}] must be an object with a description and exact evidence excerpts from changed lines`,
      );
    }
    if (!change || typeof change !== 'object') throw new Error(`changes[${index}] must be an object`);
    const title =
      change.title === undefined || change.title === null
        ? `Change ${index + 1}`
        : validateLabel(change.title, `changes[${index}].title`);
    const description = validateProse(change.description, `changes[${index}].description`);

    if (requireEvidence) {
      if (!Array.isArray(change.evidence) || change.evidence.length === 0) {
        throw new Error(`changes[${index}].evidence requires at least one exact excerpt from a changed line`);
      }
      if (change.evidence.length > 6) throw new Error(`changes[${index}].evidence has too many items`);
      for (let evidenceIndex = 0; evidenceIndex < change.evidence.length; evidenceIndex++) {
        const item = change.evidence[evidenceIndex];
        if (!item || typeof item !== 'object') {
          throw new Error(`changes[${index}].evidence[${evidenceIndex}] must be an object`);
        }
        const quote = item.quote;
        if (typeof quote !== 'string' || quote.length < 8 || quote.length > 500) {
          throw new Error(`changes[${index}].evidence[${evidenceIndex}].quote must be an exact 8-500 character excerpt`);
        }
        if (!changedContent.includes(quote)) {
          throw new Error(
            `changes[${index}].evidence[${evidenceIndex}].quote does not occur on an added or removed source line`,
          );
        }
      }
    }

    return { title, description };
  });

  return { summary, changes };
}

export function makeVersionSubmitTool() {
  return {
    name: 'submit_version_analysis',
    description: 'Submit the final client-version change analysis. This ends the analysis.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'A concise overview of what changed in this client build.' },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              evidence: {
                type: 'array',
                description: 'Exact excerpts from added/removed lines supporting this change.',
                items: {
                  type: 'object',
                  properties: { quote: { type: 'string' } },
                  required: ['quote'],
                  additionalProperties: false,
                },
              },
            },
            required: ['description', 'evidence'],
            additionalProperties: false,
          },
        },
      },
      required: ['summary', 'changes'],
      additionalProperties: false,
    },
  };
}

export function buildVersionPrompt({ oldVersions, newVersions, diffText }) {
  return `Analyze what changed between two YouTube Music web client builds.

VERSION UPDATE
${JSON.stringify({ oldVersions, newVersions }, null, 2)}

The generated unified diff of the player base.js and Polymer bundle is indexed as change.diff.
The current files are indexed as current/base.js and current/music_polymer_inlined_html.js.
The previous files are indexed as previous/base.js and previous/music_polymer_inlined_html.js.

ANALYSIS RULES
- Explain meaningful behavior, UI, network/API, playback, navigation, logging/telemetry, and experiment-infrastructure changes.
- Do not list every renamed minified symbol or mechanically enumerate the diff.
- Do not claim a user-visible change when the evidence only shows an internal refactor, build label, or logging detail; in that case describe it as internal.
- Prefer stable request/response field names, user-facing strings, element names, and stable constants.
- If a change is a new feature flag identifier, you may name that stable identifier.
- Search change.diff and the source files before concluding. Use short, specific queries. Searching change.diff for the hunk-header marker lists the changed hunks.
- The summary should be one or two sentences. changes should contain between 1 and 8 useful items when the diff is non-empty.
- Every change needs at least one evidence item with an EXACT quote copied from the content of an added or removed diff line (without the leading +/- marker). Evidence is for validation and is never published.

DIFF STATS
${diffText.length.toLocaleString()} diff characters.
${diffText.trim() ? '' : 'No differences were found in base.js or the Polymer bundle. Say that the tracked source files are unchanged for this version update; do not invent changes.'}

DIFF PREVIEW
${previewText(diffText) || '(empty diff)'}

${PROSE_RULES}

When done, call submit_version_analysis with:
{"summary":"...","changes":[{"title":"...","description":"...","evidence":[{"quote":"exact text from a changed line"}]}]}`;
}

export async function runVersionHarness({ harness, oldVersions, newVersions, diffText, oldAssets, newAssets, logger = console }) {
  const sources = {
    'change.diff': diffText,
    'current/base.js': newAssets.base,
    'current/music_polymer_inlined_html.js': newAssets.polymer,
    'previous/base.js': oldAssets.base,
    'previous/music_polymer_inlined_html.js': oldAssets.polymer,
  };
  const index = buildSourceIndex(sources);
  const tools = [...makeSourceTools(index), makeVersionSubmitTool()];
  logger.log(`version harness: analyzing ${diffText.length.toLocaleString()} characters of diff`);
  return harness.run({
    system:
      'You are a precise reverse-engineering analyst. You inspect minified client-code diffs and return a concise, evidence-based account of behavior changes as JSON. Never invent behavior or name transient minified functions.',
    user: buildVersionPrompt({ oldVersions, newVersions, diffText }),
    tools,
    submitName: 'submit_version_analysis',
    validate: (raw) => validateVersionSubmission(raw, { diffText }),
  });
}

export async function diffAssets(oldAssets, newAssets, { maxBuffer = 64 * 1024 * 1024 } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'ytm-diff-'));
  try {
    await mkdir(join(dir, 'old'), { recursive: true });
    await mkdir(join(dir, 'new'), { recursive: true });
    const sections = [];
    for (const [label, oldText, newText] of [
      ['base.js', oldAssets.base, newAssets.base],
      ['music_polymer_inlined_html.js', oldAssets.polymer, newAssets.polymer],
    ]) {
      if (oldText === newText) continue;
      const oldPath = join(dir, 'old', label);
      const newPath = join(dir, 'new', label);
      await writeFile(oldPath, oldText);
      await writeFile(newPath, newText);
      let diff = '';
      try {
        const result = await execFileAsync(
          'git',
          ['diff', '--no-index', '--no-color', '--no-ext-diff', '--unified=3', '--ignore-space-at-eol', '--', oldPath, newPath],
          { maxBuffer },
        );
        diff = result.stdout;
      } catch (error) {
        if (error.code === 1) diff = error.stdout;
        else throw error;
      }
      if (diff.trim()) {
        sections.push(`===== ${label} =====\n${diff}`);
      }
    }
    return sections.join('\n\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
