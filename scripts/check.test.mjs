import assert from 'node:assert/strict';
import test from 'node:test';
import { merge, parseYtcfg } from './check.mjs';

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
  assert.deepEqual(result.versions, { innertube: ['1.1', '1.2'], player: ['1.0', '1.1'] });
});

test('merge reports nothing for known flags and versions', () => {
  const result = merge({ alpha: {}, zeta: {} }, { innertube: ['1.2'], player: ['1.1'] }, cfg);
  assert.deepEqual(result.newFlags, []);
  assert.deepEqual(result.newVersions, {});
});
