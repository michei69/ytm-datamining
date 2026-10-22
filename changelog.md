# Changelog

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-22 16:56:07 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261020.10.00` → `1.20261020.10.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261019.09.00` → `1.20261020.09.00`

**Summary:** Player build advances by one day; user-visible playback, navigation, UI and network behavior are unchanged.

**What changed:**
- **Player build version rollover:** Release identifier advances from the 20261019 build to the 20261020 build, and logged release values update accordingly. Playback, ads, navigation, UI, and network behavior remain unchanged.

### EXPERIMENT_FLAGS
**Added:**
- `ab_fk_sk_cl` — Server-side experiment/config flag with no observable client behavior in the downloaded web client; it is present only in ytcfg EXPERIMENT_FLAGS/serialized flags (true) with no corresponding client-side gating logic found. _(requires restart: no; family: experiments/config infra)_

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-22 14:41:02 UTC

### EXPERIMENT_FLAGS
**Added:**
- `ab_det_apb_b` — Server-side experiment/config flag ab_det_apb_b present only in server-provided configuration; no client-side implementation was found in indexed sources so no observable client behavior can be confirmed. _(requires restart: no; family: misc)_

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.
