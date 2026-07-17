# AniBridge development hand-off

Last updated: 2026-07-17 (Asia/Taipei)  
Repository: `/Users/scsnake/scripts/anime-db-bridge`  
Current extension/package version: `0.9.1`

## Project goal

AniBridge is a Chrome Manifest V3 extension that connects an anime shown on a
streaming page to the corresponding entry on anime databases, list trackers,
and rating sites. It also adds Traditional Chinese and Japanese titles to
English-language database pages, so users can copy those titles or find the
work on another service.

Supported streaming sites are Bahamut Anime (`ani.gamer.com.tw`), Disney+,
Netflix, and Hami Video. The supported database-page overlays are MyAnimeList
(MAL) and AniList.

Matching must distinguish closely related entries such as separate seasons,
OVA/ONA/specials, and movies. A search result is not presented as an exact
work page unless the match confidence is sufficient.

## Current implemented behavior

### Bahamut Anime pages

- Runs on `https://ani.gamer.com.tw/animeVideo.php*`.
- Extracts the displayed title and, when present, the premiere year.
- Shows AniBridge as a right-edge drawer that is collapsed by default and does
  not cover the page until the user expands it.
- Displays copyable Traditional Chinese, Japanese, and English titles. If no
  English title exists, Romaji is shown instead.
- Shows an AniList-provided official-site link when it is explicitly classified
  as a non-disabled `INFO` link named `Official Site` or `Official Website`.
- Groups destinations into “collection/tracking” and “ratings/rankings.”
- Allows manual correction of title/year followed by a new match.
- Lets users open extension settings from the card.

### MAL and AniList pages

- Runs on `https://myanimelist.net/anime/*` and
  `https://anilist.co/anime/*`.
- Looks up the public MAL/AniList ID through AniList, then uses Bangumi to add a
  Traditional Chinese title where possible.
- Displays the same copyable multilingual-title card and official-site link.
- When a work is matched to an exact database entry, shows source-attributed
  AniList and Bangumi ratings. Scores retain their native scales
  (AniList `/100`, Bangumi `/10`); they are never combined into one score.
- Both pages include user-configurable streaming search links. Bahamut Anime
  and Netflix are enabled by default; Hami Video is optional. These can be
  changed independently of the database/list-platform settings.
- The extension deliberately does **not** fetch or parse streaming search
  results in the background. Availability remains something the user confirms
  on the destination site because it can vary by account, region, and licensing
  period.

### Disney+ and Netflix pages

- Runs on Disney+ `browse/entity-<UUID>` detail pages and Netflix `/title/<id>`,
  `/watch/<id>`, and browse-modal `?jbv=<id>` routes.
- Uses a shared SPA-aware content script that waits for metadata, observes DOM
  and history changes, and drops stale lookup responses.
- Disney+ reads the title-logo `alt` text from
  `[data-testid="details-title-treatment"] img[alt]`; the entity UUID is its
  deduplication key.
- Netflix uses the preview logo `alt` in
  `[data-uia="previewModal--player_container"]` on title/browse-modal pages
  and `[data-uia="video-title"] h4` on playback pages, so episode labels are
  not used as the parent-work title.
- When a streaming-page title has no usable database bridge, a supported Chrome
  installation can offer a user-initiated, on-device AI alias suggestion. The
  suggested aliases are still re-queried and ranked against the normal public
  databases; they never directly select an ID and are always marked for review.

### Hami Video pages

- Runs on `https://hamivideo.hinet.net/product/<ID>.do` pages.
- Uses the product ID as a deduplication key and the first Movie/TV JSON-LD
  name as the work title, with Open Graph title as a fallback.
- Hami Video's JSON-LD listing/upload dates are not used as premiere years,
  because they can differ from the work's actual release year.

### Platform settings

Each destination has one sync setting: whether it appears on the website card.
Clicking a platform row toggles that setting. A separate ↗ icon next to the row
opens the platform homepage in a new tab without toggling it. Website-card
platform links always open in a new tab. The default visible collection/list
platforms are:

- MyAnimeList
- AniList
- Bangumi
- Kitsu

Optional collection/tracking destinations are Anime-Planet, AniDB, Annict,
Simkl, and LiveChart. Optional rating/review destinations are Filmarks Anime,
あにこれ (AniKore), and IMDb.

IMDb is intentionally a search link only. Its series/season grouping may not
match MAL's entry granularity, so it must not be labelled as a verified exact
match without another mapping source.

### Icon

The icon is an original, code-authored design to avoid copyright/trademark
issues: two title cards connected by a bridge on a teal squircle. The editable
source is `icons/icon-source.svg`; Chrome PNG exports exist at 16, 32, 48, and
128 px, with a 1024 px asset also retained.

## Architecture and important files

- `manifest.json`: MV3 permissions, content-script targets, icons, and options.
- `background.js`: API calls, candidate orchestration, result construction,
  exact/search links, official-site selection, source ratings, and local cache.
- `lib/matcher.js`: title normalization, year extraction, season/format
  recognition, candidate scoring, and confidence classification.
- `lib/platforms.js`: platform registry and future-safe preference defaults.
- `lib/ui.js`: Shadow DOM card, drawer behavior, copy actions, link groups,
  correction form, and dark-mode styles.
- `content-gamer.js`: Bahamut metadata adapter and platform-preference handling.
- `content-streaming.js`: Disney+/Netflix/Hami Video integration and preference handling.
- `content-database.js`: MAL/AniList URL-ID adapter and SPA navigation observer.
- `lib/streaming-adapters.js`: testable Disney+/Netflix title/year extraction.
- `options/`: platform visibility and per-platform new-tab controls.
- `vendor/opencc-cn2t.js`: bundled OpenCC.js conversion to Taiwan Traditional
  Chinese; see the vendor license files.
- `tests/`: Node unit tests, isolated UI browser test, and a real unpacked-MV3
  extension smoke test.

No build step or runtime package install is required. The extension consists of
plain browser JavaScript, HTML, and CSS.

## Data and matching flow

### From a Bahamut page (`matchAnime`)

On a successful uncached lookup, the current sequence is:

1. Search Bangumi with the source title (up to 10 candidates).
2. Rank candidates using title/year and choose a Japanese bridge title.
3. Search AniList once (up to 8 candidates), including titles, synonyms,
   year, format, MAL ID, and external links.
4. Build links and translations, then cache the result.

This is one request to each of Bangumi and AniList for an uncached title, not
one request per destination link. Kitsu remains an optional user-opened search
destination but is not queried by the extension because its API is unreliable
in extension contexts.

### From a MAL/AniList page (`lookupAnime`)

On a successful uncached lookup, the current sequence is:

1. Query AniList once by MAL ID or AniList ID.
2. Search Bangumi once by the returned Japanese title.
3. Build the multilingual card and cross-index the cache by external IDs.

Requesting `externalLinks` for the official website is part of the existing
AniList GraphQL operation and adds no extra HTTP request.

### Matching safeguards

- Titles are normalized across punctuation/case and common page suffixes.
- Premiere year contributes to ranking.
- Numbered seasons and formats such as movie, OVA, ONA, and special are detected
  and mismatches are penalized.
- Direct URLs are only marked exact after a score threshold; otherwise the user
  receives a search URL.
- Low/medium-confidence cards remind users to verify season/year/type.

### Cache

- Successful results use `chrome.storage.local` with a 7-day TTL.
- Cache schema/version is currently `CACHE_VERSION = 8`.
- Results are also indexed by known MAL and AniList IDs.
- Settings use `chrome.storage.sync`.

Changing serialized result structure should normally increment
`CACHE_VERSION`, otherwise old cached objects can hide the change for 7 days.

## AniList API usage assessment

The current use is reasonable for a client-side extension:

- public data only, so no AniList OAuth token is required;
- one narrow GraphQL request per uncached page flow;
- only fields needed for matching, titles, links, and IDs are selected;
- successful results are cached for 7 days; and
- there is no background polling or request on every UI interaction.

AniList documents a nominal limit of 90 requests/minute, but its current
degraded limit is 30 requests/minute as of this hand-off. It also has burst
limiting and communicates rate-limit state through HTTP 429, `Retry-After`, and
rate-limit headers. References:

- <https://docs.anilist.co/guide/rate-limiting>
- <https://docs.anilist.co/guide/considerations>
- <https://docs.anilist.co/guide/auth/>

The main remaining robustness work is therefore not reducing the normal
single-page request count, but preventing bursts and retry loops:

1. Add in-flight request coalescing so simultaneous tabs looking up the same
   normalized work share one promise.
2. Handle AniList HTTP 429 explicitly. Respect `Retry-After`/reset time, store a
   short cooldown, and show a useful temporary message rather than immediately
   retrying.
3. Add a short negative/error cache for repeat failures so page refreshes or
   multiple tabs cannot create a request storm.
4. Re-evaluate freshness separately if the extension ever retrieves streaming
   availability; the current 7-day title/score cache must not be treated as a
   record of current availability.

These are recommended next improvements, not known evidence of current abuse.
The extension's present request pattern is light under ordinary interactive use.

## Streaming-provider expansion

### Feasibility

The matching, cache, platform registry, and card UI are reusable. Supporting
additional playback sites mainly requires a page-adapter layer that supplies:

```js
{
  title: "series-level title",
  year: 2026,
  sourceUrl: location.href
}
```

The likely implementation is one shared `content-streaming.js` plus per-site
adapter definitions for URL recognition and metadata extraction. Each adapter
should try stable public metadata first:

1. JSON-LD (`application/ld+json`);
2. Open Graph tags such as `og:title`;
3. document title/canonical URL; and
4. a site-specific, minimal DOM selector fallback.

Netflix, Prime Video, and Disney+ are SPAs, so the content script also needs to
detect history/DOM route changes. It must deduplicate by canonical series title
or work identity so moving between episodes does not query AniList repeatedly.
An episode title must be normalized to the parent series title before matching.

Disney+, Netflix, and Hami Video adapters are implemented without availability
lookup. Prime Video remains a future adapter and can reuse the same matching
flow.

### What DOM information is needed

The user does **not** need to provide a complete DOM dump. Full DOM from a
logged-in streaming page is undesirable because it may contain profile names,
personalized content, localization, experiment flags, or session-adjacent data.

For a site that cannot be inspected without the user's account/region, the
useful evidence is:

- one example title-page URL pattern (the title ID may remain; remove unrelated
  query parameters);
- a screenshot showing the visible title/year/season area;
- the sanitized `outerHTML` of only that small title metadata container;
- the page's `og:title`, canonical URL, and the keys/shape of relevant JSON-LD;
- examples for both a series and movie, and ideally one episode-detail route;
- the page language/region, especially `zh-TW` versus English/Japanese.

Do not provide cookies, authorization headers, local/session storage, network
HAR files containing tokens, account/profile data, or a complete saved page.

### Streaming-availability links

There are three separate levels that should not be conflated:

1. **Extension card on a provider page:** identify the current anime and show
   database/list/rating links. This is the easiest and most reliable addition.
2. **AniList external streaming links:** these can be returned in the same
   GraphQL request, so they add payload but no request. They are useful leads,
   but should be labelled as not verified for Taiwan availability.
3. **Region-accurate Taiwan availability:** this needs a provider catalogue such
   as TMDB watch providers/JustWatch-backed data and careful ID/season mapping.
   It requires credentials or a backend, additional uncached queries, shorter
   caching, and explicit region labels. It is a later phase.

TMDB's watch-provider endpoints and region filtering are documented here:

- <https://developer.themoviedb.org/reference/watch-providers-movie-list>
- <https://developer.themoviedb.org/reference/discover-tv>

Anime season boundaries on general TV databases may differ from MAL/AniList,
so provider availability cannot safely be attached using title text alone.

### Recommended phased implementation

1. Validate Disney+ and Hami Video selectors on another series and a movie.
2. Obtain a semantic Netflix details-page title selector to replace the
   class-based logo fallback where possible.
3. Extend browser fixtures for movie, series, season, and episode navigation.
4. Add a Prime Video adapter using sanitized samples.
5. Optionally expose AniList external streaming links with a clear
   “region not verified” label.
6. Only then evaluate a credentialed region-availability source.

Do not add broad host permissions for all providers until their corresponding
adapter is implemented and tested.

## Known gaps and decisions

- AniList 429/cooldown handling, request coalescing, and negative caching are not
  implemented yet.
- Only successful results receive the 30-day cache.
- Disney+, Netflix, and Hami Video page selectors need validation on more
  title/movie layouts; Netflix's details-page logo selector is class-based.
- Official links depend on AniList's external-link classification and may be
  absent even when a work has an official site.
- Additional destination platforms are search-only unless the APIs establish a
  sufficiently confident exact ID.
- The extension does not log into any service or modify a user's list.
- The extension does not scrape IMDb or Bahamut search results.
- Taiwan streaming availability is not inferred or promised.

## Verification state

All checks passed on 2026-07-17 after the official-site feature and test update:

```bash
npm run check
uv run --python 3.11 --with playwright python tests/ui_browser_test.py
uv run --python 3.11 --with playwright python tests/extension_smoke_test.py
```

At that point:

- Node unit tests: 10 passed.
- Isolated Playwright UI test: passed.
- Real unpacked Chrome MV3 smoke test: passed.

The Python commands use an ephemeral `uv` environment. Tests launch the
installed Chromium channel because headless extension loading does not work in
all bundled Playwright Chromium builds.

## Suggested next coding task

Before adding several streaming hosts at once, implement AniList burst
protection and a generic metadata-adapter seam, preserving the current Bahamut
behavior. Then add a single provider using sanitized samples. This sequence
reduces API and matching risk while keeping each change independently testable.
