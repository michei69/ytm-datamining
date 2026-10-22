const CHANGELOG_HEADER =
  '# Changelog\n\nNotable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.';

function utcLabel(date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function previousVersion(previousVersions, kind) {
  const value = previousVersions?.[kind];
  return Array.isArray(value) ? value.at(-1) : value;
}

function versionLine(kind, oldValue, newValue, changed) {
  const suffix = changed ? '' : ' _(unchanged)_';
  return `- ${kind}: ${oldValue ? `\`${oldValue}\` → ` : ''}\`${newValue}\`${suffix}`;
}

export function buildChangelogEntry({
  timestamp = new Date(),
  newVersions = {},
  previousVersions = {},
  currentVersions = {},
  versionAnalysis = null,
  baselineVersion = false,
  newFlagNames = [],
  removedFlags = [],
  reappearedFlags = [],
  flags = {},
}) {
  const sections = [`## ${utcLabel(timestamp)}`];

  if (newVersions.innertube || newVersions.player) {
    const lines = ['### Client version'];
    const innertube = currentVersions.innertube || newVersions.innertube;
    const player = currentVersions.player || newVersions.player;
    if (innertube) {
      lines.push(
        versionLine(
          'INNERTUBE_CLIENT_VERSION',
          previousVersion(previousVersions, 'innertube'),
          innertube,
          Boolean(newVersions.innertube),
        ),
      );
    }
    if (player) {
      lines.push(
        versionLine(
          'PLAYER_CLIENT_VERSION',
          previousVersion(previousVersions, 'player'),
          player,
          Boolean(newVersions.player),
        ),
      );
    }
    if (baselineVersion) {
      lines.push(
        '- No previous base.js/Polymer snapshot was available, so this run initialized the comparison baseline. Future version changes will be diffed by the analysis harness.',
      );
    }
    if (versionAnalysis?.summary) lines.push('', `**Summary:** ${versionAnalysis.summary}`);
    if (versionAnalysis?.changes?.length) {
      lines.push('', '**What changed:**');
      for (const change of versionAnalysis.changes) {
        lines.push(`- **${change.title}:** ${change.description}`);
      }
    }
    sections.push(lines.join('\n'));
  }

  if (newFlagNames.length > 0 || removedFlags.length > 0 || reappearedFlags.length > 0) {
    const lines = ['### EXPERIMENT_FLAGS'];
    if (newFlagNames.length > 0) {
      lines.push('**Added:**');
      for (const name of [...newFlagNames].sort()) {
        const flag = flags[name] || {};
        const restart =
          typeof flag.requires_restart === 'boolean' ? (flag.requires_restart ? 'yes' : 'no') : 'unknown';
        const family = flag.family || 'unknown';
        const description = flag.description || 'No description available.';
        lines.push(`- \`${name}\` — ${description} _(requires restart: ${restart}; family: ${family})_`);
      }
    }
    if (removedFlags.length > 0) {
      if (lines.length > 1) lines.push('');
      lines.push('**Removed:**');
      for (const name of [...removedFlags].sort()) lines.push(`- \`${name}\``);
    }
    if (reappearedFlags.length > 0) {
      if (lines.length > 1) lines.push('');
      lines.push('**Reappeared:**');
      for (const name of [...reappearedFlags].sort()) lines.push(`- \`${name}\``);
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

export function prependChangelogEntry(existing, entry) {
  if (!entry) return existing ?? '';
  if (!existing || !existing.trim()) return `${CHANGELOG_HEADER}\n\n${entry}\n`;
  if (!existing.trimStart().startsWith('# Changelog')) return `${CHANGELOG_HEADER}\n\n${entry}\n\n${existing.trim()}\n`;
  const remainder = existing.replace(/^# Changelog\s*/i, '').trim();
  return `${CHANGELOG_HEADER}\n\n${entry}\n${remainder ? `\n${remainder}` : ''}\n`;
}

export function makeWebhookMessages({
  newVersions = {},
  previousVersions = {},
  currentVersions = {},
  versionAnalysis = null,
  baselineVersion = false,
  newFlagNames = [],
  removedFlags = [],
  reappearedFlags = [],
  flags = {},
}) {
  const lines = [];
  if (newVersions.innertube || newVersions.player) {
    lines.push('**Client version update**');
    const innertube = currentVersions.innertube || newVersions.innertube;
    const player = currentVersions.player || newVersions.player;
    if (innertube) {
      lines.push(
        versionLine(
          'INNERTUBE_CLIENT_VERSION',
          previousVersion(previousVersions, 'innertube'),
          innertube,
          Boolean(newVersions.innertube),
        ),
      );
    }
    if (player) {
      lines.push(
        versionLine(
          'PLAYER_CLIENT_VERSION',
          previousVersion(previousVersions, 'player'),
          player,
          Boolean(newVersions.player),
        ),
      );
    }
    if (baselineVersion) lines.push('_No previous source snapshot existed; baseline initialized for future diffs._');
    if (versionAnalysis?.summary) lines.push('', versionAnalysis.summary);
    if (versionAnalysis?.changes?.length) {
      lines.push('', '**What changed:**');
      for (const change of versionAnalysis.changes) {
        lines.push(`- **${change.title}:** ${change.description}`);
      }
    }
  }

  if (newFlagNames.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(`**New EXPERIMENT_FLAGS** (${newFlagNames.length})`);
    for (const name of [...newFlagNames].sort()) {
      const flag = flags[name] || {};
      const restart =
        typeof flag.requires_restart === 'boolean' ? (flag.requires_restart ? 'yes' : 'no') : 'unknown';
      lines.push(`- \`${name}\` — ${flag.description || 'No description available.'}`);
      lines.push(`  requires restart: **${restart}** · family: **${flag.family || 'unknown'}**`);
    }
  }

  if (removedFlags.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(`**Removed EXPERIMENT_FLAGS** (${removedFlags.length})`);
    for (const name of [...removedFlags].sort()) lines.push(`- \`${name}\``);
  }

  if (reappearedFlags.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(`**Reappeared EXPERIMENT_FLAGS** (${reappearedFlags.length})`);
    for (const name of [...reappearedFlags].sort()) lines.push(`- \`${name}\``);
  }

  const text = lines.join('\n').trim();
  if (!text) return [];

  // Discord webhooks accept at most 2,000 characters. Split on line boundaries
  // and use a small safety margin rather than truncating information.
  const messages = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (current.length + line.length + 1 > 1_900 && current) {
      messages.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) messages.push(current);
  return messages;
}
