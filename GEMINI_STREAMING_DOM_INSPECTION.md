# Streaming-platform DOM inspection brief for Gemini

## Role and objective

You are inspecting streaming-service title pages in **the user's already signed-in Chrome profile** for the AniBridge Chrome extension. AniBridge needs to identify the *parent anime work* on a streaming page so it can show links to AniList, MyAnimeList, Bangumi, and other databases.

Inspect only page metadata needed to extract a title, optional release year, optional season/type, and a stable work identifier for route-change deduplication. Do not change any account setting, playback state, watchlist, profile, or browser configuration.

## Platforms and samples

Inspect these platforms when the user has access to them:

1. Netflix
2. Prime Video
3. Disney+

For each platform, collect separate samples where available:

- an anime series landing/detail page;
- a movie page; and
- an episode/playback route that still exposes enough parent-series metadata.

Use the user's normal locale (preferably note whether it is `zh-TW`, English, or Japanese). Titles can change by locale, and an episode title must not be mistaken for the series title.

## Strict privacy and safety boundaries

Never collect, copy, display, or transmit:

- cookies, authorization headers, bearer tokens, API keys, signed URLs, DRM data, or request/response bodies;
- local storage, session storage, IndexedDB, cache contents, service-worker data, or browser history;
- passwords, email addresses, profile/account names, billing data, watch history, watchlists, recommendations, or other personalised content;
- complete page HTML, a full DOM dump, screenshots that expose account details, or HAR/network-export files.

Do not open DevTools network panels for this task. Do not navigate to account, profile, billing, or settings pages. Do not play, resume, pause, add, remove, rate, or otherwise interact with any title beyond opening its public detail page.

If a useful element contains personal data, stop and report that a sanitized user-provided sample is required instead of copying it.

## Inspection method

For each sample:

1. Record a sanitized URL pattern only. Keep the path shape and a non-secret title/content ID if present; remove query parameters and any values that could identify the user.
2. Inspect these sources in order, preferring the first stable source that contains the parent work title:
   - `script[type="application/ld+json"]` (report only relevant key names and non-personal example values);
   - `meta[property="og:title"]`, `meta[name="twitter:title"]`, and canonical-link metadata;
   - semantic attributes such as `data-testid`, `aria-label`, `role="heading"`, and `alt`;
   - a small, stable DOM container around the title metadata.
3. Identify one or more robust selectors. Prefer `data-testid`, semantic attributes, and stable element relationships. Do **not** rely on hashed/generated CSS class names or an absolute XPath.
4. Determine whether each candidate is the parent series/movie title, season title, or current episode title. Explicitly reject selectors that return only the episode title.
5. Look for an optional release year, season number/count, media type, and content ID. Do not infer values that are not visibly present.
6. For SPA navigation, note whether the relevant container is replaced or updated after moving between title pages. A `MutationObserver`/URL-change approach may be needed, but do not implement it.

## Output format

Return one section per platform and sample using this exact template:

```md
### <Platform> — <series | movie | episode/playback>

- Locale: `<locale or unknown>`
- Sanitized URL pattern: `<origin/path shape; no query string>`
- Parent-work title observed: `<value>`
- Current episode title observed: `<value or not present>`
- Candidate title selector: `<selector>`
- Why it is stable: `<data-testid / semantic attribute / metadata explanation>`
- Candidate year selector/value: `<selector and value, or not present>`
- Candidate season/type selector/value: `<selector and value, or not present>`
- Stable content-ID source: `<URL/attribute source, or not present>`
- Metadata checked: `<JSON-LD / Open Graph / canonical findings>`
- Minimal sanitized DOM evidence:
  ```html
  <only the title/metadata element; redact unrelated attributes and URLs>
  ```
- SPA/navigation note: `<what changed or unknown>`
- Recommended extraction order: `<primary selector> -> <metadata fallback> -> <document-title fallback>`
- Risks/ambiguities: `<for example: title appears only as a logo image alt, locale-dependent>`
```

## Disney+ hint from an existing sanitized sample

On a Disney+ series detail page, the parent title was available as the `alt` text of the logo image inside the title-treatment container:

```js
document.querySelector('[data-testid="details-title-treatment"] img[alt]')?.alt
```

This produced `Medalist`. The same page also had:

- parent metadata in `[data-testid="masthead-metadata"]` (for example, `2025 – 2026 • 2 Seasons • Drama, Animation`);
- the current episode in `[data-testid="details-featured-focused-title"]`.

Treat the latter as episode metadata, not the canonical work title. Verify the selectors on another Disney+ title and on a movie before recommending them as the only implementation path.

## Completion criteria

Finish with a compact comparison table covering all inspected samples. State clearly:

- which selector should be the primary title source for each platform;
- which fallbacks are safe;
- whether the current page provides a usable parent-work ID;
- which platform needs an additional sanitized sample before implementation; and
- any information that could not be collected without crossing the privacy boundaries above.
