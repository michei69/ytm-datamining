# ytm-datamining

Tracks YouTube Music web-client experiment flags and client builds, and uses an
OpenAI-compatible Chat Completions model only when there is something to
analyze.

## What the scheduled check does

1. Fetches `https://music.youtube.com/`, its player `base.js`, and the
   `music_polymer_inlined_html.js` Polymer bundle.
2. Adds unseen `EXPERIMENT_FLAGS` to `flags.json` and unseen client versions to
   `versions.json`.
3. Scans all same-origin scripts loaded by the page (plus live `ytcfg` flags) for
   every known flag. A flag must be missing for several consecutive runs before
   it is marked with `"removed": true`; that miss counter lives in
   `flag-state.json`. Flags that come back have that marker removed.
4. If there are new/incomplete flags, one tool-using model harness can search
   `base.js`, the Polymer bundle, and the page config. It fills only missing
   `description`, `requires_restart`, and `family` fields. An existing
   description is immutable and can never be overwritten by the model.
5. If a client version changed and a previous source snapshot exists, a second,
   independent model harness searches a unified diff of `base.js` and the
   Polymer bundle to summarize the behavior changes.
6. Both model jobs run concurrently when both apply. If neither applies (and no
   missing metadata exists), no model endpoint is called.
7. Appends the findings to `changelog.md` and posts the same information to the
   configured Discord webhook.

## Required secrets / environment variables

For normal scheduled runs, configure these as GitHub Actions secrets or
repository variables:

| Variable | Purpose |
| --- | --- |
| `OPENAI_COMPLETIONS_URL` | Full OpenAI-compatible Chat Completions URL, e.g. `https://api.openai.com/v1/chat/completions`. `OPENAI_COMPLETIONS_ENDPOINT` is accepted as an alias. |
| `OPENAI_API_KEY` | Bearer key for the endpoint. |
| `OPENAI_MODEL` | Model name sent in the request. |
| `DISCORD_WEBHOOK_URL` | Discord webhook used for change notifications. |

`OPENAI_BASE_URL` (for example `https://api.openai.com/v1`) can be used instead
of the full completions URL; `/chat/completions` is appended. `OPENAI_ENDPOINT`
and `OPENAI_KEY` are accepted as shorter aliases. The endpoint must support the
tool/function-calling API used by the harness. If it does not, the harness falls
back to a single-context JSON answer when the provider clearly reports that
tools are unsupported.

The model variables are only required on a run that actually needs analysis.
A no-change run works without any OpenAI configuration. The GitHub workflow
accepts the endpoint variables as either repository secrets or variables.

Client version state is stored as `versions.current` plus the historical version
arrays. Comparing against `current` means a rollback to an older build is still
detected and analyzed.

Optional:

- `YTM_SNAPSHOT_DIR`: where the previous `base.js` / Polymer snapshot is cached
  (default `.cache/scripts`).
- `FLAG_REMOVAL_MISSES`: how many consecutive observations must omit a flag
  before it is marked removed. Defaults to `3` to avoid false positives from
  experiment bucketing.
- `OPENAI_FLAG_BATCH_SIZE`: number of flags analyzed per harness batch. Defaults
  to `4`; failed multi-flag batches are automatically split and retried.
- `OPENAI_MAX_STEPS`: maximum tool/submission turns per harness conversation.
  Defaults to `24`.

## Local test

```bash
node --test scripts/check.test.mjs
```

To run the watcher locally, export the variables above and run:

```bash
node scripts/check.mjs
```

## Notes on generated flag descriptions

The prompts explicitly forbid describing minified code by transient function or
method names. Descriptions must describe behavior using stable labels, element
names, request fields, and stable identifiers such as `YTM_*`. The validator
rejects answers containing phrasing like “according to function x.y()”.

Model submissions must also include exact source excerpts as evidence. Flag
excerpts are checked against the source context around the flag; version-change
excerpts are checked against added/removed diff lines. Evidence is used only for
validation and is not written to the changelog or webhook.
