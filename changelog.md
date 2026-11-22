# Changelog

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-22 05:58:51 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `ab_det_sb_lo`
- `music_web_is_canary`
- `wiz_experiment_ytd_list_item_view_model`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-21 18:56:14 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `ab_net_tp_e`

**Reappeared:**
- `wiz_experiment_ytd_preview_comment_feature`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-21 06:30:42 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261117.06.00` → `1.20261117.06.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261118.11.01-canary_experiment_1.20261117.10.00` → `1.20261117.10.00`

**Summary:** The previous build was a canary-experiment flavor of the same player version (1.20261117.10.00); the new build is the plain base build of that version. The diff is dominated by a full regeneration of internal names and constant tables, and the only substantive delta is the embedded player release label, which reverts from the canary-experiment RC to the base RC and therefore changes only build/telemetry reporting.

**What changed:**
- **Player release label reverts from canary-experiment RC to base RC00:** The build label baked into the player changed from youtube.player.web_20261118_11_RC01 to youtube.player.web_20261117_10_RC00. This is internal/telemetry only: it is the value reported in the playback stats payload field release_version, in the feedback product data field player_release, and in the debug release name surfaced when the web_player_release_debug flag is enabled. No playback or UI behavior changes.
- **Canary-experiment variant of the build is dropped:** The version string no longer carries the canary_experiment marker that the client uses to classify the player client version (a label ending in canary_experiment maps to the "canary" state, otherwise "none"). With this build the client reports the plain state (CLIENT_CANARY_STATE_NONE) instead of CLIENT_CANARY_STATE_CANARY for the player canary state / player client version telemetry dimensions. Experiment gating logic itself is unchanged; only the reported canary classification differs.
- **Internal build regeneration with no behavior change:** Every internal name and constant table in the player was regenerated for this build, long routines were moved between the obfuscator's indirection wrappers, and line wrapping shifted by a couple of dozen lines. All removed/added pairs describe the same logic (same flags, same DOM classes, same payload fields, same user-facing strings such as the seek-overlay announcements and "More videos"/"More shorts" labels), so this is a packaging difference with no behavior change.
- **Feature-flag surface unchanged between the two builds:** The same experiment/killswitch identifiers appear on both sides of the diff (for example the ad-CPN macro fix, the unified-seek DTTs path, and the SSDAI abandon-ping flag), and the same player canary-state branches plus the ad/SSDAI, seek-overlay and suggested-video code paths exist in both. The canary-experiment build did not ship additional gated behavior that is missing here.

### EXPERIMENT_FLAGS
**Removed:**
- `maw_error_screen_redesign`
- `web_attributed_string_deep_equal_bugfix`
- `web_enable_signed_in_chunk_prediction`
- `web_live_chat_available_bugfix`
- `wiz_experiment_ytd_preview_comment_feature`

**Reappeared:**
- `wiz_experiment_ytd_report_history_section_renderer`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-20 06:38:27 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261117.06.00` → `1.20261117.06.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261119.04.00-canary_experiment_1.20261117.10.00` → `1.20261118.11.01-canary_experiment_1.20261117.10.00`

**Summary:** No user-facing change is evidenced in this update: playback, ad/interstitial UI, error messages, experiment flags and request fields behave identically to the previous build, and the Music app bundle is unchanged. The differences are internal build/version identification and regenerated generated code only.

**What changed:**
- **Player reports an earlier canary build revision:** Internal build/versioning change only. The player identifies itself as an earlier canary build (web_20261118_11_RC01 instead of web_20261119_04_RC00), matching the reported version bump. Nothing about playback, ads, or UI behavior follows from this; it is a build label used when the player reports its own version.
- **Internal constant table for stream/URL handling regenerated:** Internal code-generation change with no observable effect. The constant table used by the player's URL/stream handling (videoplayback path, index.m3u8, cmo, fvip, signatureCipher, redirector.googlevideo.com, etc.) is now emitted as a plain list rather than a delimited string that was split at runtime, and its ordering changed. The same constants and the same URL/stream handling behavior are present, so stream selection and playback URLs are unaffected.
- **Full internal code regeneration with identical behavior:** Internal refactor only. The whole player was regenerated with fresh internal names, but the behavior is unchanged: the same UI strings, the same player CSS/element class names (e.g. ytp-ad-module, ytp-ad-player-overlay-layout, ytp-video-interstitial-buttoned-centered-layout), the same ad/error messages, and the same experiment flag names appear before and after. No user-facing change is attributable to this item.
- **Experiment flags are read through a separate lookup from configuration values:** Internal plumbing change. Checks for experiment flags (e.g. enable_ipad_webview_innertube_context_override, enable_web_tiered_gel, web_attention_logging_enabled) now read them through a separate lookup from the client-configuration values, whereas one lookup previously served both. The same flag names are consulted and the same branches are taken, so no experiment behavior changes.
- **Internal dispatch indirection regenerated:** Internal code-generation churn. Helpers that are reached through the build's indirection layer were re-emitted with different call-site handles and argument counts. The wrapped helpers still perform the same work, so this does not change any observable behavior.

### EXPERIMENT_FLAGS
**Removed:**
- `web_video_preview_sparkles_click_location_helper`

**Reappeared:**
- `ab_det_sb_lo`
- `mweb_fix_cinematic_fullscreen_leak`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-19 20:18:33 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261115.14.00` → `1.20261117.06.00`
- PLAYER_CLIENT_VERSION: `1.20261115.00.00` → `1.20261119.04.00-canary_experiment_1.20261117.10.00`

**Summary:** This build pair is dominated by a rebuild of both the player base.js and the Music Polymer bundle, so there are almost no product-level changes. The concrete deltas are: a new client-logging event id (cacheTelemetryEvent), the player now shipping a canary_experiment build label (which flips the reported client canary state), and a new parallel protobuf serialization path for playback/SABR messages in the player.

**What changed:**
- **New client logging event: cacheTelemetryEvent:** The client-side telemetry/GEL event enum gained one new entry, cacheTelemetryEvent (id 575), immediately after elementsReceivedResourcesEvent (574). It appears in both the player base.js and the Music Polymer bundle, i.e. both bundles can now emit a new cache-related telemetry event. This is a logging/telemetry addition; no UI is affected.
- **Player now identifies itself as a canary_experiment build:** The player build label embedded in the player code changed to youtube.player.web_20261119_04_RC00, matching the new canary_experiment player version. The client's canary-state derivation (unchanged logic) inspects the trailing segment of the client version string: a version ending in canary_experiment maps to "canary", canary_control to "control", otherwise "none". Because the shipped player version now carries the canary_experiment suffix, the client reports CLIENT_CANARY_STATE_CANARY (instead of control/none) in its client context/logging. This is experiment-infrastructure metadata, not a user-visible change.
- **Player gained a second (parallel) protobuf serialization path for playback/SABR messages:** Many playback, SABR/media, ad, QoE and ping serializers were duplicated: each now has two implementations and dispatches on the runtime type of the message object (a legacy plain-object path and a second, class-based/typed path that can also construct typed message instances). The protobuf field numbers in both branches are identical, so the wire format of playback/SABR requests and pings is unchanged; this is an internal serialization refactor (dual message-representation support), not a protocol change.
- **Music app features, flags and user-facing strings carried over unchanged (build-only rebuild):** Beyond the three items above, the Music web app's observable behavior is the same in both builds: its toast pipeline (using ytmusic-notification-text-renderer when music_web_enable_white_client_toasts is on, tp-yt-paper-toast otherwise, positioned above the player bar), its subscriber-gated server-queue restoration, its dismissal timestamp key, and the popup/dialog element sets are all carried over unchanged. The remaining bulk of the diff is a rebuild of both bundles in which internal helper names, property keys and lookup tables were regenerated, which produces no new UI, navigation or request/response field behavior.

### EXPERIMENT_FLAGS
**Added:**
- `ab_net_tp_e` — Server-side experiment/config flag delivered through ytcfg's EXPERIMENT_FLAGS and serializedExperimentFlags. No client-side implementation or observable UI behavior for this flag is present in the indexed client source, so its behavior cannot be determined from the client code. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `ab_det_sb_lo`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-18 06:48:38 UTC

### EXPERIMENT_FLAGS
**Added:**
- `wiz_experiment_ytd_preview_comment_feature` — Server-side experiment/config flag delivered in the client's page config (ytcfg experiment flags) with a value of true in the observed runtime config. In this build no client code path reads this key: the only occurrence anywhere in the indexed client bundle is the entry in the serialized experiment-flag object, and searches for any flag-derived identifiers (preview_comment / previewComment / PREVIEW_COMMENT / CommentPreview, ytd_preview_comment_*) find nothing else. Comparable wiz_experiment_ytd_* keys are gated explicitly when used (for example the ghost/skeleton grid variant of the shared ytd renderers is registered only when its own ytd experiment key is enabled), so the absence of any lookup for this key means it has no observable effect on the current YouTube Music web client; whatever comment-preview gating it denotes must be handled server-side or in a build not shipped here. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `enable_ai_companion`
- `web_enable_killswitch_for_selectable_list_item_on_tap_fix`
- `web_enable_killswitch_tabindex_fix`
- `web_list_item_duplicate_command_killswitch`
- `web_list_item_flat_button_label_killswitch`

**Reappeared:**
- `web_enable_signed_in_chunk_prediction`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-17 20:40:46 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261115.14.00` → `1.20261115.14.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261111.09.00` → `1.20261115.00.00`

**Summary:** No observable playback, advertising, navigation or UI behavior changed in this player build. The player simply reports a newer build identifier (the 20261115_00 build instead of 20261111_09), with its internal naming/obfuscation scheme regenerated and internal helper names remapped; experiment flags, ad/player element names, accessibility labels and the available media formats are identical, and the YouTube Music UI bundle is unchanged.

**What changed:**
- **Player build identifier bumped to the 20261115_00 build (internal):** The build identifier the player reports for itself was updated from the 20261111_09 build to the 20261115_00 build. This identifier is used for build/version identification and logging only; it is an internal version bump rather than a feature change.
- **Internal naming/obfuscation scheme regenerated (no behavior impact):** The internal name-mangling scheme used throughout the player bundle was regenerated for this build: the table used for dynamic property access changed delimiter, ordering and contents, and the obfuscation keys used to decode internal names changed with it. This is an internal repackaging pass; it does not alter what the player does.
- **Internal helper and namespace exports renamed, call sites updated in lockstep:** Internal helper names were remapped consistently across the whole bundle, including helpers exposed on the player's public namespace object (for example the boolean experiment-flag reader and the error-reporting helper). Call sites were remapped in lockstep, so this is an internal-only rename with no observable effect.
- **No behavioral difference found: experiment flags, ad/player UI labels and format table unchanged:** Behavior-bearing values are unchanged between the two builds: the same experiment/feature flag names (e.g. the clickable instream player endcap flag), the same ad and player overlay element names and accessibility labels (e.g. the 'more videos' suggestion view and its previous/next buttons), and an identical media format/quality table with no new formats or resolutions. The YouTube Music UI bundle is unchanged, so no Music-side UI change accompanies this build.

### EXPERIMENT_FLAGS
**Added:**
- `wiz_experiment_ytd_list_item_view_model` — Server-side experiment/config flag exposed only through the ytcfg EXPERIMENT_FLAGS map in the page bootstrap config (observed value true); it sits alongside other wiz_experiment_ytd_* entries that gate desktop (ytd) renderer experiments. No client code in this build reads this flag, so there is no observable client behavior to describe: it does not gate the yt-list-item-view-model component or any list item rendering path that could be confirmed from the shipped JavaScript. Its effect, if any, is applied by the server when deciding which renderer/view-model payloads to return. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `music_web_is_canary_control`
- `mweb_fix_cinematic_fullscreen_leak`

**Reappeared:**
- `music_web_enable_action_bar_view_model_in_player_overlay`
- `music_web_enable_like_count_in_player_overlay`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-17 07:23:59 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261110.04.00` → `1.20261115.14.00`
- PLAYER_CLIENT_VERSION: `1.20261110.09.00` → `1.20261111.09.00`

**Summary:** Both bundles were rebuilt, so the vast majority of the 13.9M-character diff is internal renaming plus a player build-label bump. The real product deltas are small: basic-content paragraphs can now render server-supplied markdown, ad buttons accept custom colors, and lockup action/menu buttons request mainstage icon sizing.

**What changed:**
- **Basic content paragraphs now render markdown body text:** The basic-content view model gains support for a new markdownText field on a paragraph: the paragraph content block now renders when asset, text or markdownText is present, and markdown text is rendered through the common-mark view model inside the same paragraph-text wrapper (reusing the bold/primary class bindings) with typography set to inherit and the configured markdown plugins. User-visible: server-provided formatted body copy in dialogs, sheets and lockup attachments can be displayed as markdown instead of plain text.
- **Ad button view model accepts custom colors:** The ad-button view model now takes an optional customColors input and, when supplied, merges it into the button model it builds (the same customColors object the shared button renderer already understands for icon color and gradient). Advertiser-supplied button theming is therefore applied to ad CTA buttons and ad button groups instead of being ignored.
- **Lockup action-bar and overflow buttons request mainstage icon sizing:** Icon-only lockup action buttons now include mainstageIconSize:true in their override objects, both for the action-bar buttons and for the overflow/menu button in the icon-only-40 position. Because the shared button renderer already honours mainstageIconSize, icons in these lockup action slots render at the mainstage size rather than the default icon size.
- **Player build label and embedded cache-busting tokens updated:** Internal only: the player's embedded build/version identifier moved from the 2026-11-10 09:00 RC00 label to the 2026-11-11 09:00 RC00 label, which is what the player parses to derive its build date, and the internal string table now carries new opaque cache-busting tokens. No playback behaviour is implied by these constants.
- **Internal rebuild with no observable behaviour change:** Internal only: essentially all of the diff is a rebuild in which internal identifiers are re-assigned across the whole bundle (helpers, classes, methods and dependency-injection token constants such as the player-controller and suspense-controller tokens) while the surrounding logic stays equivalent. It should not be read as a behaviour change.
- **URL-scheme sanitizer in the inlined library refactored:** Internal only: the anchor/URL check in the inlined Closure-style library was split into a helper that returns the value only when the existing safe-scheme pattern matches, with an added (currently unused) list of data/http/https/mailto/ftp schemes, and the script/style tag-name guard was extracted out of the inner-HTML setter. Accept/reject semantics are unchanged.

### EXPERIMENT_FLAGS
**Removed:**
- `ab_mis_log_err`

**Reappeared:**
- `ab_det_sb_lo`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-16 05:46:38 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `ab_fk_sk_cl`
- `wiz_experiment_ytd_report_history_section_renderer`
- `wiz_next_ld_fix_client_ve_spec`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-15 18:40:18 UTC

### EXPERIMENT_FLAGS
**Added:**
- `music_web_enable_ad_pause_fix` — Fixes play/pause UI state handling during ad playback. When enabled, the play/pause button stays enabled while an ad is showing instead of being disabled, and the "is playing" indicator is synced directly from ad state changes so it reflects whether the ad is actually playing. Without the flag, the play/pause control can be disabled and the playing indicator can desync from the real ad playback state. _(requires restart: no; family: player/playback)_

**Removed:**
- `music_web_enable_station_ccv`

**Reappeared:**
- `music_web_is_canary`
- `music_web_is_canary_control`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-15 05:46:14 UTC

### EXPERIMENT_FLAGS
**Added:**
- `ab_mis_log_err` — A/B experiment measurement flag carried in the client's experiment-flag map (delivered both as a boolean in the experiment flags object and in the serialized experiment flags string). It belongs to the same 'ab_'-prefixed group of experiment-detection/measurement switches and, based on the trimmed flag name, governs whether errors encountered while logging/reporting A/B experiment assignments are surfaced. No client-side implementation consuming this key appears in the analyzed sources, so it exists only as server-assigned experiment/config configuration with no observable UI or playback behavior in the client. _(requires restart: no; family: experiments/config infra)_
- `enable_h5_ustreamer_driven_smearing` — Selects which measurement path supplies ad/playback 'smearing' (the server-provided timing offsets used when attributing ad events and pings such as QOES) for the HTML5 player. When enabled for the relevant client type, the client reads the value of this flag; otherwise it falls back to the separate web-only variant of the same smearing setting. It is consulted together with related smearing switches (e.g. the LIFA smearing variant) while the player decides between the micro-streamer-driven and client-side implementations, and it is only reached for enabled reporting/telemetry paths, so it changes measurement plumbing rather than any user-visible control. _(requires restart: no; family: player/playback)_

**Reappeared:**
- `wiz_experiment_ytd_redeem_code_feature`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-14 17:50:03 UTC

### EXPERIMENT_FLAGS
**Added:**
- `web_renderer_stamper_skip_element_pool_for_cow` — Controls whether the Polymer renderer stamper skips the shared element pool for components that are CoW (client-side Wiz) web-component wrappers. When enabled, such custom elements are not returned to the reusable element pool when they are removed from a stamped list/container, so they are recreated fresh instead of being recycled and re-stamped; when disabled, they are pooled and reused like other custom elements. This affects DOM stamping/component reuse behavior (and thus recycled-element reuse counters) rather than any user-facing label or layout. _(requires restart: no; family: experiments/config infra)_
- `wiz_experiment_ytd_report_history_section_renderer` — Server-side experiment/config flag that gates the experimental ytd_report_history_section_renderer (a report-history section renderer) in the Wiz rendering framework. In this build it only appears as a boolean entry in the client's experiment-flags config delivered via ytcfg; there is no client-side code path, custom element, or renderer in the YouTube Music web client that reads it, so it is a server-side experiment/config flag with no observable client behavior. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `log_gel_compression_latency_lr`
- `wiz_experiment_ytd_redeem_code_feature`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-14 05:46:12 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261110.04.00` → `1.20261110.04.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261111.09.00-canary_experiment_1.20261110.09.00` → `1.20261110.09.00`

**Summary:** The player build label rolls back from the canary-experiment build (web_20261111_09_RC00) to the standard release (web_20261110_09_RC00), and one telemetry event type is dropped; otherwise both builds expose the same feature gates and behavior, with the Polymer/Music UI bundle unchanged.

**What changed:**
- **Player build label reverts from canary experiment build to standard release:** The embedded player release identifier reported in playback statistics and in the feedback/debug product data changes from the canary-experiment build to the standard release build. This is a build-label/rollout change; the version-parsing helper that derives the build date from that label reports the new date instead.
- **Telemetry event type elementsReceivedResourcesEvent removed from client event enum:** The client event/log type enumeration used by the service-worker health database and general event logging loses the trailing entry for received-resources events (id 574). All remaining entries (through 573) are unchanged, so this event type can no longer be recorded or reported in the new build. Only internal telemetry is affected; nothing user-visible.
- **Internal media-URL constant tokens regenerated:** The internal constant tokens used by the player's media-URL handling (googlevideo host matching, local/proxy URL rewriting and the 'ep' URL parameter) are regenerated between builds. Behavior of URL rewriting and playback URL validation is otherwise identical; this is an internal mechanism change with no user-visible effect.
- **No functional or experiment-gate changes detected in shared player features:** Comparing stable identifiers that both builds share - the clickable endcap-ad experiment gate and its layout z-index values (65/66/67), playerResponseCpn plumbing into playback stats and remote-control payloads, the AV1 probe codec-level experiment, the audio-description setting behavior, custom scrubber v2, ad preload/cue flags, and the interstitial ad layout element names - shows the same logic and the same experiment identifiers in both builds. No experiment flag was added or removed and no user-facing playback, ad, or navigation behavior differs, so this update is an internal rebuild of the same player.

### EXPERIMENT_FLAGS
**Reappeared:**
- `wiz_next_ld_fix_client_ve_spec`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-13 05:57:06 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261110.04.00` → `1.20261110.04.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261103.11.00-canary_control_1.20261112.04.00` → `1.20261111.09.00-canary_experiment_1.20261110.09.00`

**Summary:** Apart from a bumped hardcoded player build label and one new analytics event identifier, this player bundle revision carries no evidenced user-visible, playback, API, or navigation change; the remaining differences are internal build/obfuscation churn.

**What changed:**
- **Player build label / reported client version updated (internal):** The hardcoded player web client version string changed from youtube.player.web_20261103_11_RC00 to youtube.player.web_20261111_09_RC00. It is parsed with date regexes to derive the build date reported as the client version and is also embedded as a request parameter value, so the reported client version changes, but the surrounding logic is unchanged.
- **New analytics event identifier added to the client event table:** A new client event identifier, elementsReceivedResourcesEvent with numeric id 574, was appended to the same event-name/value table that already contains shortsEffectStartedEvent:571, shortsEffectEndedEvent:572 and networkQualityTransitionEvent:573. This adds a new logging/telemetry surface; no UI is affected.
- **Per-build token in stream URL handling replaced (internal):** Internal only: the opaque per-build token used inside the player's stream-URL / signature-handling table was rotated (sq9iliW875smKIB593-_w8_ was replaced by dPsE3mwl9wEoKIB393-_w8_). The surrounding URL-sanitising data (googlevideo host patterns, cmo parameters, fallback_count, Untrusted URL handling) is otherwise unchanged, so this is a build artifact rather than a behavioral change.

### EXPERIMENT_FLAGS
**Removed:**
- `music_web_is_canary`
- `web_enable_signed_in_chunk_prediction`
- `wiz_next_ld_fix_client_ve_spec`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-12 19:43:41 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261110.04.00` → `1.20261110.04.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261103.11.00` → `1.20261103.11.00-canary_control_1.20261112.04.00`

**Summary:** The player build label changed from 1.20261103.11.00 to 1.20261103.11.00-canary_control_1.20261112.04.00, but the tracked source files (player base.js and the Polymer bundle) are byte-identical. This is a canary/control channel reassignment with no client-code changes.

### EXPERIMENT_FLAGS
**Added:**
- `web_enable_wiz_next_hover_logging` — Enables hover-gesture interaction logging for visual-element (VE) logging targets. When on, an element whose logging directives declare a hover gesture type (gestures.types bit for hover) gets a mouse-enter tracker that measures how long the pointer dwells on it; dwell times between 500 ms and 600000 ms are then reported as an INTERACTION_LOGGING_GESTURE_TYPE_HOVER interaction log carrying hoverData.durationHoveredMs, and the element is re-armed for the next hover. The flag also switches gesture-type lookup to prefer directives carried in the element's context/rendererContext logging context before falling back to the element's own loggingDirectives, and hover trackers are cancelled when an element's visual-element logging is torn down. When off, no hover dwell interaction events are emitted and only the element's own loggingDirectives are consulted for gesture types. _(requires restart: no; family: telemetry/logging)_
- `wiz_experiment_ytd_redeem_code_feature` — Server-provided experiment/config flag from the YouTube-desktop (ytd) 'wiz_experiment_ytd_*' experiment group, configured alongside other ytd renderer experiments (comments entry-point header renderer, page introduction renderer) and a redeem-code feature toggle. It appears only in the page's server-supplied experiment flag configuration; no shipped Music web bundle reads it, so it has no observable client-side behavior in this client and should be treated as a server-side experiment/config flag for a code-redemption feature with no client implementation in the evidence. _(requires restart: no; family: experiments/config infra)_

**Removed:**
- `enable_zero_prefix_mention_suggestion_web`
- `music_web_is_canary_control`
- `web_enable_killswitch_for_skip_child_tags`
- `web_exclusive_hover_killswitch`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-12 06:40:49 UTC

### EXPERIMENT_FLAGS
**Removed:**
- `music_web_enable_action_bar_view_model_in_player_overlay`
- `music_web_enable_like_count_in_player_overlay`

**Reappeared:**
- `ab_fk_sk_cl`
- `music_web_enable_station_ccv`
- `mweb_fix_cinematic_fullscreen_leak`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-11 19:26:00 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261104.00.00` → `1.20261110.04.00`
- PLAYER_CLIENT_VERSION: `1.20261103.11.00` → `1.20261103.11.00` _(unchanged)_

**Summary:** This build is dominated by minifier churn (renamed internals, renumbered generator/closure helpers, semantically identical code), with a few real changes: multi-select rows now render their overflow menu inert, the product/shopping description shelf and content-line view models were dropped in favor of a stub registration, and the basic section header view model added a secondaryDescription line.

**What changed:**
- **Multi-select mode now makes list-item menus inert (accessibility/interaction):** The Polymer template of the responsive list item now binds the inert attribute to the multi-select flag on the item's overflow menu. When multi-select is active, the row menu becomes non-interactive and non-focusable, so accidental menu activation is blocked while selecting items. No other change to that template's structure or bindings was observed.
- **Product/shopping description shelf and content-line view models removed from the bundle:** The dedicated product/shopping description components are no longer defined in this build: the shelf component, its content-line, content-line-item and description-item sub-components, and the lazy-load registrations for the shelf and description-item tokens are gone. The shoppingDescriptionShelfViewModel slot is now mapped to a stub loader that only registers the YtShoppingDescriptionShelfViewModel tag name and returns a placeholder, so server data for that shelf can no longer be rendered by a real component. The separate shoppingHubProductViewModel slot is unchanged.
- **Section header view model gains a secondary description line:** The shared basic section header view model now reads a secondaryDescription field from its data and renders it in a separate text element below the title and subtitle (new response field plus a new element class). This is an added renderer capability rather than a change to existing rendered content.

### EXPERIMENT_FLAGS
**Added:**
- `music_web_enable_spacebar_play_pause_fix` — Selects which Space-key handling the player uses for play/pause. When enabled, a Space keydown anywhere in the page triggers the spacebar play/pause handler and suppresses the default page scroll, unless the focused element is a content-editable field (so typing a space in text entry, e.g. comment or search boxes, still works). When disabled, the older, narrower rule applies: the shortcut only fires if the focused target is a recognized control (paper button, paper icon button, paper FAB, paper slider) or the movie_player video element, and is ignored otherwise. _(requires restart: no; family: player/playback)_
- `music_web_enable_white_client_toasts` — Chooses the component used to display the client's transient toast/notification messages (playback errors, generic player errors and other queued status text). When enabled, the toast service builds a ytmusic-notification-text-renderer element (the white/light text notification) and displays each queued message through it as a successResponseText value, opened above the player bar using the --ytmusic-player-bar-height CSS custom property. When disabled, the legacy tp-yt-paper-toast element is built instead and the plain message text is shown in it with a vertical offset. The component type is chosen once when the toast service is created at client startup. _(requires restart: no; family: popup/dialog/menus)_

**Removed:**
- `mweb_fix_cinematic_fullscreen_leak`

**Reappeared:**
- `web_enable_signed_in_chunk_prediction`
- `wiz_next_ld_fix_client_ve_spec`

Notable YouTube Music client-version and EXPERIMENT_FLAGS changes detected by this repository.

## 2026-11-11 05:35:40 UTC

### Client version
- INNERTUBE_CLIENT_VERSION: `1.20261104.00.00` → `1.20261104.00.00` _(unchanged)_
- PLAYER_CLIENT_VERSION: `1.20261103.11.00-canary_control_1.20261104.09.00` → `1.20261103.11.00`

**Summary:** The generated diff for this version update is empty: the player base.js and Polymer bundle are byte-identical to the previous build. The only variation is the version label association (the previous player version carried a canary_control suffix while the current one is the plain release), with no detectable behavior, API, UI, or logging differences in the tracked client source.

### EXPERIMENT_FLAGS
**Added:**
- `html5_disable_airplay_button_for_embeds` — When true, embedded players suppress the AirPlay output-picker button: AirPlay target availability is only advertised when the browser exposes WebKit playback target events AND the player instance is not an embed running with this flag enabled, so embeds lose the AirPlay device picker entirely. When false, embeds keep offering AirPlay device selection. _(requires restart: no; family: player/playback)_

**Reappeared:**
- `music_web_is_canary_control`

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
