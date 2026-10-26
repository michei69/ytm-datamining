# Changelog

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-26 18:32:23 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261020.10.00` → `1.20261020.10.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261020.09.00` → `1.20261021.08.00`

**Summary:** This player build is almost identical to the previous one; the real behavioral deltas are confined to the batched telemetry/logging transport: a new `web_send_vss3_pings` gate for registering the VSS transport, per-event visitor-session routing checks, and reworked handling of send/serialization failures. The release identifier was also bumped to the 20261021_08 build.

**What changed:**
- **Change 1:** Internal only: the player release identifier used in debug/release reporting (and for parsing the release date) advanced from youtube.player.web_20261020_09_RC00 to youtube.player.web_20261021_08_RC00. It is surfaced only when release-debug reporting is enabled and has no functional effect.
- **Change 2:** The condition that decides whether the isolated VSS/GEL logging transport is registered (and thus whether QoE/VSS pings go out through that transport) now also honors a new server-controlled flag `web_send_vss3_pings`; previously only `html5_send_qoe_on_gel` and `web_send_vss3_isolated_payload` could enable it. Users whose experiment config sets the new flag will now have their pings routed through the isolated transport.
- **Change 3:** Telemetry behavior change: when flushing a batch of batched log events, a failure thrown by the networkless send is now funnelled through a single guarded failure handler that reports the error to the error-reporting sink, decrements the outstanding-batch count and invokes the completion callback, so remaining batches are still counted; per-batch serialization failures are reported and skipped and later batches still send. Previously such failures were re-thrown through generic error handling and could short-circuit the remaining batches.
- **Change 4:** Telemetry routing: with `web_vss_routing_check_all_tier_policies` enabled, the batch flusher now inspects every event payload in the batch (looking for visitor-session-approved/CTN-tagged entries) to decide whether the batch needs the isolated visitor-only transport path, instead of relying only on the batch-level flag. Mixed batches can therefore be routed differently than before.
- **Change 5:** Internal security/hardening: the worker that serializes batched log events, started from the `WORKER_SERIALIZATION_URL` page variable, is now constructed from a Trusted Types script URL instead of the raw string. What gets serialized and sent is unchanged.

### EXPERIMENT_FLAGS
**Added:**
- `wiz_next_ld_fix_client_ve_spec` — Server-side experiment/config flag exposed only through ytcfg EXperimentFlags; no client-side implementation for this key exists in the bundled client code. It belongs to the WIZ next-generation visual-element (VE) logging experiments (siblings include wiz_next_client_ve_parent_fix and wiz_next_tracking_key_prioritize_client_ve_spec) and appears to gate a server-side fix related to logging directives carrying clientVeSpec data. No observable UI or client runtime behavior is controlled by it in this build. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `music_web_is_canary`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-26 04:08:18 UTC

### EXPERIMENT_FLAGS
**Added:**
- `ab_det_el_h_v2` — Server-side experiment/config flag delivered through ytcfg EXPERIMENT_FLAGS (also mirrored in serializedExperimentFlags as ab_det_el_h_v2=true). No client-side implementation referencing this key exists in the indexed client source, so it produces no observable UI or playback behavior on its own; it is purely an experiment assignment/config value reported to the backend with client requests. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `music_web_is_canary_control`

**Reappeared:**
- `web_enable_signed_in_chunk_prediction`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-25 15:51:31 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `web_dedup_ads_lifecycle_scheduled_events`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-25 04:04:08 UTC

### EXPERIMENT_FLAGS
**Reappeared:**
- `ab_fk_sk_cl`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-24 15:40:45 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `music_web_enable_action_bar_view_model_in_player_overlay`
- `music_web_enable_like_count_in_player_overlay`
- `web_enable_signed_in_chunk_prediction`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-24 04:02:35 UTC

### EXPERIMENT_FLAGS
**Added:**
- `html5_force_debug_data_for_client_tmp_logs` — When enabled, ad slot and layout client log payloads include extra debugData details such as slotId, layoutId and entry/fulfillment/expiration trigger data in adClientDataEntry slotData and layoutData; when disabled those debug fields are omitted. _(requires restart: no; family: telemetry/logging)_
- `web_dedup_ads_lifecycle_scheduled_events` — Server-side experiment/config flag with no observable client behavior in the available sources; it appears only as a boolean in server-provided configuration with no client-side implementation. By name it suggests deduplication of scheduled ads-lifecycle events. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `ab_fk_sk_cl`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-10-23 04:10:39 UTC

### EXPERIMENT_FLAGS
**Added:**
- `music_web_enable_action_bar_view_model_in_player_overlay` — ytcfg experiment flag, enabled in this build. It targets rendering of the player overlay's button row (player page / mini-player action area) through the shared action bar view model instead of legacy individual button renderers. No client code in this build reads the flag: the client renders the action bar view model group (yt-video-action-bar-view-model with its segmented like/dislike button child) whenever the server includes that data in the response, so the flag's effect can only be expressed in the server-provided player overlay payload. Treat it as a server-side experiment/config flag with no client-side gate and no independently observable client behavior. _(requires restart: no; family: player/playback)_
- `music_web_enable_like_count_in_player_overlay` — ytcfg experiment flag, enabled in this build. It targets showing the like count (the numeric value alongside the thumbs-up toggle) in the player overlay. This build's client contains no reference to the flag: the like button component (like-button-view-model) already takes its number text from the server-provided likeCountIfIndifferent / likeCountIfLiked fields whenever those fields are present in the response. Whether the count is displayed therefore depends on the payload the server returns, so this is a server-side experiment/config flag with no client-side gate and no independently observable client behavior. _(requires restart: no; family: player/playback)_
- `web_enable_signed_in_chunk_prediction` — ytcfg experiment/config flag, enabled in this build, and it is also forwarded to the server in the serialized experiment-flag parameter string that accompanies requests. It governs 'chunk prediction' for signed-in users, i.e. speculative prediction/prefetch of the next content chunk based on a load-prediction model. No client module in this build reads the flag, so it is a server-side experiment/config flag: the prediction decision is made from the request context and the flag's effect is not observable as client-side UI or client-side code branching. _(requires restart: no; family: service-worker/caching)_

**Removed:**
- `ab_det_sb_lo`
- `add_auth_headers_to_remarketing_google_dot_com_ping`
- `desktop_search_bigger_thumbs_style`
- `enable_desktop_search_bigger_thumbs`
- `kevlar_prefetch_data_augments_network_data`
- `mweb_player_control_on_hover`
- `web_enable_ai_search_streaming`
- `web_enable_retries`
- `web_layout_system_update`
- `web_side_rail_dismissible_panels`
- `web_stateless_chip_button_role_killswitch`

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
