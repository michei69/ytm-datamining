# Changelog

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-10 19:30:21 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261104.00.00` → `1.20261104.00.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261103.11.00` → `1.20261103.11.00-canary_control_1.20261104.09.00`

**Summary:** The tracked source files (base.js and Polymer bundle) are unchanged for this version update; only the build identifier changed.

### EXPERIMENT_FLAGS
**Removed:**
- `music_web_enable_station_ccv`

**Reappeared:**
- `music_web_enable_action_bar_view_model_in_player_overlay`
- `music_web_enable_like_count_in_player_overlay`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-10 06:46:55 UTC

### EXPERIMENT_FLAGS
**Added:**
- `embeds_web_enable_fullscreen_conversion_ve_logging` — Controls whether the embedded web player tags its conversion/tracking parameters with a fullscreen-specific source visual-element ID. When enabled and the embed player is in fullscreen, it prepends a fixed source VE id (139117) to the comma-joined `source_ve_path` request parameter that is attached to embed video/thumbnail/link URLs alongside `embeds_widget_referrer`, `embeds_referring_euri`, and `embeds_referring_origin`. When disabled, that fullscreen id is not inserted (falling back to other experiment-arm or default source paths), so the behavior is limited to embed conversion analytics logging rather than any user-visible UI change. _(requires restart: no; family: telemetry/logging)_

**Removed:**
- `ab_det_sb_lo`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-09 22:08:34 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `ab_det_el_h_v2`
- `wiz_next_ld_fix_client_ve_spec`

**Reappeared:**
- `mweb_fix_cinematic_fullscreen_leak`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-08 17:49:19 UTC

### EXPERIMENT_FLAGS
**Added:**
- `music_web_enable_station_ccv` — Server-side experiment/config flag delivered via ytcfg. It is only present in the client configuration payload and has no observable client-side implementation in the indexed sources, so it does not directly control any UI or playback behavior in the web client code; its effect (if any) is applied server-side. _(requires restart: no; family: experiments/config infra)_
- `wiz_experiment_ytd_page_introduction_renderer` — Server-side experiment/config flag delivered via ytcfg. It is only present in the client configuration payload and has no observable client-side implementation in the indexed sources, so it does not directly control any UI or rendering behavior in the web client code; its effect (if any) is applied server-side. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `music_web_enable_action_bar_view_model_in_player_overlay`
- `music_web_enable_like_count_in_player_overlay`
- `mweb_fix_cinematic_fullscreen_leak`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-07 17:38:42 UTC

### EXPERIMENT_FLAGS
**Reappeared:**
- `ab_det_sb_lo`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-07 05:27:17 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261104.00.00` → `1.20261104.00.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261104.09.00-canary_experiment_1.20261103.11.00` → `1.20261103.11.00`

**Summary:** This update rolls the player back from a canary-experiment label (20261104_09) to the RC00 build 20261103_11. Beyond the changed release-version string, the change set shows no detectable difference in UI, playback, network/API behavior, navigation, or experiment logic — behavior appears unchanged with only the build label moving.

**What changed:**
- **Player release identity rolled back to the 20261103 RC00 build:** The player now identifies itself as youtube.player.web_20261103_11_RC00 instead of the previous canary-experiment label youtube.player.web_20261104_09_RC00. This stable identifier is surfaced in diagnostics/telemetry — the video stats `release_version` field, the feedback `player_release` field, and error/reporting payloads — and reflects a different build lineage rather than a user-visible behavior change.
- **No change to playback, ads UI, or logging behavior:** Sampled behavior across playback stats reporting, offline/network status handling, touch and mouse interaction handlers, and ad UI rendering (ad badge, ad details line, skip button, interstitial layout, timed pie countdown) is identical in the new build. Error text, DOM class names (e.g. the ytp-ad-details-line style variants), feature-flag checks, and telemetry fields are unchanged, so no user-visible or API behavior change is evident beyond the build label.

### EXPERIMENT_FLAGS
**Removed:**
- `kevlar_keyboard_button_focus`

**Reappeared:**
- `ab_det_el_h_v2`
- `wiz_next_ld_fix_client_ve_spec`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-06 19:08:24 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261104.00.00` → `1.20261104.00.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261103.11.00` → `1.20261104.09.00-canary_experiment_1.20261103.11.00`

**Summary:** The player build was refreshed to the 20261104.09 canary release (from 20261103.11). Apart from the updated build identifier reported in logs and playback URLs, and refreshed internal obfuscation tokens, playback, UI, ads and API handling behave the same as the previous build.

**What changed:**
- **Player build identifier reported as 20261104.09 canary:** The player version string used for logging and URL/request construction is now 'youtube.player.web_20261104_09_RC00' instead of 'youtube.player.web_20261103_11_RC00'. Version-date parsing is unchanged, so only the reported build identifier differs.
- **Playback URL and fallback tokens refreshed:** URL-handling constants are the same set (a1.googlevideo.com, /videoplayback, /api/manifest, /file/index.m3u8, playerfallback, signatureCipher, fvip, cmo=td/cmo=pf, mn, sp, rr), but an opaque token bundled with them changed to a new hardcoded value. This is internal parameter churn; the same URL recognition and fallback behavior applies.
- **No user-visible UI, ads, settings, or telemetry changes:** Behavioral surfaces are unchanged: the clickable-instream-endcap ad experiment 'enable_clickable_instream_player_for_endcap_on_web' with its player-clickable-ad layout container and z-index handling, the 'Ambient mode' versus 'Cinematic lighting' settings label switch gated by 'web_player_use_cinematic_label_2', the client-event name list, and the quality/itag tables. The remainder is internal renaming of temporary identifiers.

### EXPERIMENT_FLAGS
**Reappeared:**
- `ab_det_apb_b`
- `music_web_is_canary`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-05 19:44:28 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261031.09.00` → `1.20261104.00.00`
- PLAYER_CLIENT_VERSION: `1.20261102.08.00` → `1.20261103.11.00`

**Summary:** The build adds an experiment that switches Music's client-generated toasts to the notification-text component (with focus restoration), updates the player build label, and otherwise shows no other observable behavior changes.

**What changed:**
- **New experiment: music_web_enable_white_client_toasts reroutes client toasts:** The toast queue manager now checks the experiment `music_web_enable_white_client_toasts`. When enabled it creates a `ytmusic-notification-text-renderer` element instead of `tp-yt-paper-toast`, passes the message as `data.successResponseText`, offsets it above the player bar using the player-bar height, and opens it. When disabled it keeps the legacy paper-toast path. The change is visible only when the experiment is on: toasts render with the notification-text component rather than the paper-toast element.
- **White-client toast path restores focus on close:** With the new toast experiment enabled, the notification-text toast is configured with `restoreFocusOnClose`, matching the legacy paper-toast behavior so keyboard focus returns to the previously focused element after a toast closes. This is part of the same flagged change rather than a separate toggle.
- **Player release label advanced to youtube.player.web_20261103_11_RC00:** The player release identifier changed from `youtube.player.web_20261102_08_RC00` to `youtube.player.web_20261103_11_RC00`; the version-parsing helper derives the build date from this string. This is release/telemetry metadata rather than a user-facing feature.
- **Internal build regeneration of the player and UI code:** Both the player and the UI payload were rebuilt with a different internal encoding/obfuscation scheme and regenerated private names. This is an internal build artifact change; experiment flags, custom element names, CSS custom properties, and request/response fields seen in the diff match the previous build.

### EXPERIMENT_FLAGS
**Added:**
- `enable_mini_app_web_ads` — Enables ad-specific player handling for YouTube Music when it is running inside the mini-app web view. When true, and the player's web player context is the mini-app ad context (web player context id "WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_MINI_APP_AD") and the loaded video is an ad, the player treats that surface the same way it treats a dedicated ad player: the progress bar is bounded by the ad's skippable duration (skippableAdProgressBarDuration from the player response in playerConfig.webPlayerConfig) or the countable seekable range, and when the lead-in unified UI is also enabled it uses the current-time/duration-for-UX values, so ad countdown/progress is shown instead of plain video progress. With the flag off, mini-app ad playback is not given that ad progress treatment. _(requires restart: no; family: player/playback)_

**Removed:**
- `ab_det_apb_b`

**Reappeared:**
- `mweb_fix_cinematic_fullscreen_leak`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-04 19:36:12 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261031.09.00` → `1.20261031.09.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261101.05.00` → `1.20261102.08.00`

**Summary:** This player rebuild introduces no new user-facing features: ad UI, seek/scrubber UI, media-session integration, captions and playback request parameters behave as before, and no new experiment flags or UI strings were added. The only behavioral adjustment found is a guard on the unified-seek scrubber's reset path; the rest of the change set is internal build churn.

**What changed:**
- **Change 1:** The embedded player build identifier, which the player parses to derive its build date for version/stats reporting, was updated from the 20261101_05 build to 20261102_08. This is a build-metadata bump rather than a user-visible feature change.
- **Change 2:** In the seek/scrubber UI state handling, the reset path previously always issued the teardown/reset transition; it is now gated on the scrubber not already being in its initial idle state, matching the component's existing "is not idle" predicate. This avoids redundant reset work and animation teardown (for example when the player is minimized while the scrubber is idle). Internal robustness refinement with no evidenced visible UI change.
- **Change 3:** No user-visible changes were found in the remaining areas checked: the feature list controlling unified seek (chapter seeking, skip-to-live, speedmaster), the clickable-instream-player/endcap ad flags, skip-button and preview-ad rendering, PO token handling, captions, and media-session metadata/handlers are all unchanged. The remainder of the difference is internal build-level churn.

### EXPERIMENT_FLAGS
**Removed:**
- `ab_fk_sk_cl`
- `disable_clicked_visual_element_in_command_handler`
- `html5_web_po_experiment_ids`
- `log_click_with_layer_from_element_in_command_handler`
- `music_web_is_canary`
- `mweb_fix_cinematic_fullscreen_leak`
- `par_bir_key`
- `refresh_upon_dismiss_channel_creation_from_playlists`
- `web_enable_arrow_key_navigation_in_dropdown`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-04 05:41:03 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261031.09.00` → `1.20261031.09.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261101.05.00-canary_control_1.20261102.08.00` → `1.20261101.05.00`

**Summary:** The tracked source files (player base.js and the Polymer bundle) are byte-for-byte unchanged between these builds; the only version delta is that the player version string lost its "-canary_control_..." experiment suffix and reverted to the plain release label 1.20261101.05.00. No behavior, UI, network, playback, or telemetry changes are present in the client code.

### EXPERIMENT_FLAGS
**Added:**
- `wiz_experiment_ytd_comments_entry_point_header_renderer` — Server-side experiment/config toggle delivered only through the client's experiment config (ytcfg). Its name ties it to the comments entry point header renderer (the comments prompt/teaser header shown above the comments section), but the indexed client bundle contains no reference to this flag, so no observable client-side behavior can be attributed to it from this evidence: the flag value is simply published to the client and any effect is decided server-side (e.g. which response renderer/configuration the backend sends). _(requires restart: no; family: experiments/config infra)_
- `wiz_next_tracking_key_prioritize_client_ve_spec` — Controls which value the client uses as the logged tracking key when it attaches visualization/impression logging to a rendered element that carries more than one candidate spec. When enabled, the element's clientVeSpec-derived key (built from the response's clientVeSpec fields uiType and elementIndex) is preferred; if no clientVeSpec is present the client falls back to the generic visualization/logging spec, and then to the element's own client-ve-type attribute. When disabled the precedence is reversed, so the generic spec wins over clientVeSpec. Because the key is cached on the element and the cached key is invalidated when it changes, the setting also decides whether an element's visualization/logging registration (visual element) is rebuilt with the new spec on re-render. read per element render/logging pass. _(requires restart: no; family: telemetry/logging)_

**Removed:**
- `enable_music_web_comments`
- `kevlar_log_offline_current_network_type_ks`
- `kevlar_log_updated_time_for_smart_downloads`
- `mweb_enable_more_chunks`
- `tvhtml5_use_rta_manager_for_async`
- `use_command_context_force_click_logging_killswitch`
- `web_button_or_anchor_click_logging_killswitch`
- `web_enable_card_view_model_hover_effect`
- `web_enable_channel_pivot_panel`
- `web_show_ep_endpoint_response_received`
- `wiz_next_ld_fix_client_ve_spec`
- `yt_badge_supported_renderer_ks`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-03 19:19:05 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261027.10.00` → `1.20261031.09.00`
- PLAYER_CLIENT_VERSION: `1.20261027.11.00` → `1.20261101.05.00-canary_control_1.20261102.08.00`

**Summary:** This build is dominated by re-obfuscation/renaming churn (only a handful of net line changes per hunk), with a few real deltas: a new client telemetry event for network-quality transitions, stricter capability gating for hybridized-format changeType playback, an internal refactor of the Innertube request pipeline around a new auth-header provider token, and an updated player build label (the release is a canary-control build).

**What changed:**
- **New telemetry event: network quality transitions:** The client logging event enum gains a new entry networkQualityTransitionEvent (id 573), appended after the Shorts effect events. This adds a new event type the app can log (alongside the pre-existing networkQualityIntervalEvent), i.e. additional network-quality telemetry plumbing rather than a UI change.
- **Format hybridization / changeType support is now capability-only:** When deciding whether a played format supports switching (hybridization), the player previously enabled supportsChangeType if the client capability check passed OR the html5_format_hybridization experiment flag was on. The experiment fallback is gone: the capability check (SourceBuffer/ManagedSourceBuffer changeType support) is now the only gate, so clients without changeType no longer get hybridized format switching even when the experiment is enabled.
- **Internal refactor of Innertube request pipeline and auth headers:** Internally only: the request/response machinery now exposes request building and raw fetching as methods on the network machine (with the existing maw_network_machine_raw_request / all_web_network_machine_raw_request gates delegated through it), and auth headers are supplied by a new dependency-injection token AUTH_HEADERS_PROVIDER_TOKEN that can resolve asynchronously before headers are merged. No request/response field or user-facing behavior change is implied.
- **Player build label updated (canary-control release):** The embedded player build identifier used for logging and version parsing moved from the previous 2026-10-27 build string to youtube.player.web_20261101_05_RC00, while the served player version is the canary-control build (1.20261101.05.00-canary_control_1.20261102.08.00). This is build/version bookkeeping, not a user-visible behavior change.

### EXPERIMENT_FLAGS
**Added:**
- `web_thumbnail_hover_overlay_prevent_mouse_focus` — When enabled, the thumbnail hover overlay layer (the scrim/overlay element that sits on top of video, album, and playlist thumbnails and can act as a button with a tabindex) suppresses the default action of mousedown events on itself. As a result, clicking a thumbnail's hover overlay does not transfer mouse focus onto the overlay button — focus stays where it was, so the overlay is only focusable through keyboard navigation and clicking it does not steal focus or leave a focus ring behind. _(requires restart: no; family: cards/shelves/lockups)_

**Removed:**
- `ab_det_el_h_v2`
- `web_enable_signed_in_chunk_prediction`

**Reappeared:**
- `music_web_enable_action_bar_view_model_in_player_overlay`
- `music_web_enable_like_count_in_player_overlay`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-01 17:48:34 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261020.10.00` → `1.20261027.10.00`
- PLAYER_CLIENT_VERSION: `1.20261021.08.00` → `1.20261027.11.00`

**Summary:** This build adds experiment-gated ad pause/resume handling and optional badge rendering in shopping detail line items, while advancing player compatibility thresholds and introducing new telemetry event IDs. Other differences appear to be internal implementation churn without clear user-facing effects.

**What changed:**
- **Experiment-gated ad pause/resume support:** Adds `music_web_enable_ad_pause_fix` handling that separates ad playback state from normal player state, listens for ad-state changes, and enables the play/pause control during ads when the flag is on. With the flag off, the previous behavior of disabling play/pause during ads is preserved.
- **Shopping content line items can render a badge:** The shopping content line-item view model now renders an optional `viewModel` badge after its text, using a modern badge renderer. This allows product/detail line items supplied by the server to show an inline badge when present.
- **Player signature and build-age compatibility thresholds updated:** The player’s `signatureTimestamp`/UTC-based compatibility value advances from 20746 to 20753, and the stale-player minimum build check advances to `1008496665`. These changes affect when the client reloads an outdated player for playback compatibility rather than changing normal UI directly.
- **New telemetry event identifiers:** Adds new logging enum values for TV HTML5 app telemetry and Shorts effect start/end events. This is telemetry infrastructure, not a directly visible UI change.

### EXPERIMENT_FLAGS
**Added:**
- `music_web_enable_diwali_2026_statement_banner` — Enables the Diwali 2026 presentation of a server-supplied statement banner in ytmusic-statement-banner-renderer. When true, the banner is rendered full-bleed, its primary and secondary buttons use the large button size, and a promo badge containing an icon and the text "YouTube Music" is inserted above the banner title. It does not create or fetch the banner itself; it only changes how an existing statement banner is displayed. _(requires restart: yes; family: cards/shelves/lockups)_

**Reappeared:**
- `music_web_is_canary`

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
