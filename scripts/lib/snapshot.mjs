import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { join } from 'node:path';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const SNAPSHOT_MANIFEST = 'manifest.json';

export async function loadSnapshot(dir, { logger = console } = {}) {
  try {
    const manifest = JSON.parse(await readFile(join(dir, SNAPSHOT_MANIFEST), 'utf8'));
    const [baseGz, polymerGz] = await Promise.all([
      readFile(join(dir, 'base.js.gz')),
      readFile(join(dir, 'music_polymer_inlined_html.js.gz')),
    ]);
    const [base, polymer] = await Promise.all([gunzipAsync(baseGz), gunzipAsync(polymerGz)]);
    return {
      base: base.toString('utf8'),
      polymer: polymer.toString('utf8'),
      manifest,
    };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    if (error.code === 'EACCES' || error.code === 'EPERM') throw error;
    // A cache may be partially written or evicted mid-restore. Treat any other
    // read/JSON/gzip failure as a missing baseline so the next save repairs it.
    logger.warn(`Ignoring unreadable client snapshot in ${dir}: ${error.message}`);
    return null;
  }
}

export async function saveSnapshot(dir, { base, polymer, versions, urls, fetchedAt }) {
  await mkdir(dir, { recursive: true });
  const [baseGz, polymerGz] = await Promise.all([
    gzipAsync(Buffer.from(base, 'utf8'), { level: 9 }),
    gzipAsync(Buffer.from(polymer, 'utf8'), { level: 9 }),
  ]);
  await Promise.all([
    writeFile(join(dir, 'base.js.gz'), baseGz),
    writeFile(join(dir, 'music_polymer_inlined_html.js.gz'), polymerGz),
  ]);
  const manifest = {
    version: 1,
    fetchedAt,
    versions,
    urls,
    bytes: { base: Buffer.byteLength(base), polymer: Buffer.byteLength(polymer) },
  };
  await writeFile(join(dir, SNAPSHOT_MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
