# Streaming-platform DOM inspection results

Inspected with the user's signed-in Chrome profile on 2026-07-17. This document contains only sanitized selector and URL-pattern findings. It intentionally excludes raw DOM exports, screenshots, profile data, browser state, and local scratch-script paths.

## Scope

- Inspected: Netflix and Disney+
- Not inspected: Prime Video (out of scope)
- Locale: not recorded
- Inspecting model: Gemini 3.5 Flash

## Disney+

### Series detail page

- Sanitized URL pattern: `https://www.disneyplus.com/browse/entity-<UUID>`
- Stable work identifier: the UUID in `entity-<UUID>`.
- Parent-work title: the `alt` text of the logo image selected by:

  ```js
  document.querySelector('[data-testid="details-title-treatment"] img[alt]')?.alt
  ```

- Metadata container: `[data-testid="masthead-metadata"]`.
- Metadata observed: release year/year range, season count, and genres.
- Do not use `[data-testid="details-featured-focused-title"]` as the primary work title: it identifies the featured/current episode.

### Recommended extraction order

1. `[data-testid="details-title-treatment"] img[alt]` for the parent title.
2. Parse the first four-digit year from `[data-testid="masthead-metadata"]` when present.
3. Fall back to Open Graph/canonical/document-title metadata only if the title treatment is absent.

### Remaining validation

Verify the same selectors on one Disney+ movie and on a second series before making the title-treatment selector the only implementation path.

## Netflix

### Browsing/details modal

- Sanitized URL patterns:
  - `https://www.netflix.com/title/<ID>`
  - `https://www.netflix.com/browse?jbv=<ID>` when a browse-page preview modal is open
- Details container: `[data-uia="previewModal--container"]`.
- Metadata container: `[data-uia="videoMetadata--container"]`.
- Metadata observed: `.year` and `.duration` elements inside the metadata container.
- Reported title sources:
  - image logo: `[data-uia="previewModal--player_container"] img[alt]` via its `alt` attribute;
  - legacy fallback: `.previewModal--player-titleTreatment-logo` or `.playerModel--player__storyArt` via `alt`;
  - a textual title element in the preview modal.

The `data-uia` image container is the preferred implementation selector. The class-based image selectors are retained only as guarded fallbacks. A follow-up sanitized sample should identify a textual parent-title element inside the preview modal.

### Playback route

- Sanitized URL pattern: `https://www.netflix.com/watch/<ID>`
- Title container: `[data-uia="video-title"]`.
- Parent series title: `[data-uia="video-title"] h4`.
- Current episode label/title: `[data-uia="video-title"] span`.

The parent-series element must be used for matching; the episode element is supplementary metadata only.

### Recommended extraction order

1. A confirmed semantic selector for the parent work inside `[data-uia="previewModal--container"]` (pending follow-up).
2. `[data-uia="video-title"] h4` on playback routes.
3. The logo `alt` only as a guarded fallback after verifying it on multiple titles.
4. Open Graph/canonical/document-title metadata as a last fallback.

## Implementation implications

- Both services are single-page applications. Their content script must observe URL and relevant-DOM changes, and deduplicate lookups by the stable provider ID when available.
- Disney+ exposes a usable detail-page work ID in its URL. Netflix title and watch IDs should be treated as route identifiers unless a stable parent-work relationship is confirmed for episodic playback.
- Neither result supports inferring Taiwan availability; these findings only enable AniBridge's database-link card on the provider page.

## Recommended Netflix follow-up

The extension currently uses the reported title-logo `alt` selector as a guarded details-page source and `[data-uia="video-title"] h4` for playback pages. Provide a minimal sanitized element or selector for the textual parent title inside the Netflix preview modal, preferably one using `data-uia`, `aria-*`, or another stable semantic attribute, to reduce reliance on the class-based logo selector. Verify it on at least one series and one movie.
