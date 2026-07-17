(function initStreamingAdapters(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AniBridgeStreamingAdapters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function streamingAdaptersFactory() {
  "use strict";

  function extractMetadata(document, location) {
    const hostname = String(location?.hostname || "").toLowerCase();
    if (hostname === "www.disneyplus.com") return extractDisneyPlus(document, location);
    if (hostname === "www.netflix.com") return extractNetflix(document, location);
    if (hostname === "hamivideo.hinet.net") return extractHamiVideo(document, location);
    return null;
  }

  function extractDisneyPlus(document, location) {
    const entity = String(location.pathname || "").match(/^\/browse\/entity-([\w-]+)/u);
    if (!entity) return null;

    const title = valueOf(document.querySelector('[data-testid="details-title-treatment"] img[alt]')?.alt);
    if (!title || isGenericTitle(title)) return null;

    const metadata = textOf(document.querySelector('[data-testid="masthead-metadata"]'));
    return {
      provider: "disneyplus",
      workKey: `disneyplus:${entity[1]}`,
      title,
      year: firstYear(metadata),
      sourceUrl: location.href
    };
  }

  function extractNetflix(document, location) {
    const pathname = String(location.pathname || "");
    const search = String(location.search || "");
    const titleRoute = pathname.match(/^\/title\/(\d+)/u);
    const watchRoute = pathname.match(/^\/watch\/(\d+)/u);
    const jbvMatch = search.match(/[?&]jbv=(\d+)/u);
    const browseRoute = pathname.startsWith("/browse") && !!jbvMatch;
    if (!titleRoute && !watchRoute && !browseRoute) return null;

    const details = document.querySelector('[data-uia="previewModal--container"]');
    const playbackTitle = textOf(document.querySelector('[data-uia="video-title"] h4'));
    const uiaLogoTitle = valueOf(details?.querySelector('[data-uia="previewModal--player_container"] img[alt]')?.alt);
    const storyArtTitle = valueOf(details?.querySelector('img.playerModel--player__storyArt[alt]')?.alt);
    const logoTitle = valueOf(details?.querySelector('img.previewModal--player-titleTreatment-logo[alt]')?.alt);
    const semanticLogoTitle = valueOf(
      details?.querySelector('img[class*="titleTreatment"][alt], img[class*="title-treatment"][alt]')?.alt
    );
    const textualTitle = firstText(details, [
      '[data-uia="previewModal--title"]',
      '[data-uia*="titleTreatment"]',
      '[data-uia*="title-treatment"]'
    ]);

    let fallbackTitle = "";
    if (document.title && document.title !== "Netflix") {
      const match = document.title.match(/《?([^》]+)》?\s*-\s*Netflix/u);
      if (match) fallbackTitle = match[1].trim();
    }

    const candidates = [
      uiaLogoTitle,
      storyArtTitle,
      logoTitle,
      semanticLogoTitle,
      playbackTitle,
      textualTitle,
      fallbackTitle
    ];
    const title = candidates.find(c => c && !isGenericTitle(c)) || "";
    if (!title) return null;

    const metadata = textOf(document.querySelector('[data-uia="videoMetadata--container"]'));
    const videoId = titleRoute ? titleRoute[1] : (jbvMatch ? jbvMatch[1] : null);

    return {
      provider: "netflix",
      // A playback URL identifies an episode. Dedupe it by the exposed parent title
      // so switching episodes does not trigger another lookup for the same series.
      workKey: videoId ? `netflix:title:${videoId}` : `netflix:series:${normalizeKey(title)}`,
      title,
      year: firstYear(metadata),
      sourceUrl: location.href
    };
  }

  function extractHamiVideo(document, location) {
    const product = String(location.pathname || "").match(/^\/product\/(\d+)\.do$/u);
    if (!product) return null;

    const schema = firstMediaSchema(document);
    const title = valueOf(schema?.name) || cleanHamiTitle(
      document.querySelector('meta[property="og:title"]')?.content
    );
    if (!title || isGenericTitle(title)) return null;

    return {
      provider: "hamivideo",
      workKey: `hamivideo:${product[1]}`,
      title,
      // Hami Video's JSON-LD dates describe listing/upload dates rather than
      // the work's premiere. Do not feed those incorrect years into matching.
      year: null,
      sourceUrl: location.href
    };
  }

  function firstYear(value) {
    const match = String(value || "").match(/(?:19|20)\d{2}/u);
    return match ? Number(match[0]) : null;
  }

  function normalizeKey(value) {
    return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[\p{P}\p{S}\s]/gu, "");
  }

  function firstText(container, selectors) {
    if (!container) return "";
    for (const selector of selectors) {
      const text = textOf(container.querySelector(selector));
      if (text) return text;
    }
    return "";
  }

  function firstMediaSchema(document) {
    const scripts = document.querySelectorAll?.('script[type="application/ld+json"]') || [];
    for (const script of scripts) {
      try {
        const item = findMediaSchema(JSON.parse(script.textContent || ""));
        if (item) return item;
      } catch (_error) {
        // A malformed unrelated JSON-LD block must not prevent the metadata fallback.
      }
    }
    return null;
  }

  function findMediaSchema(value) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
      if (types.some((type) => ["Movie", "TVSeries", "TVEpisode"].includes(type)) && valueOf(item.name)) {
        return item;
      }
      const nested = findMediaSchema(item["@graph"] || []);
      if (nested) return nested;
    }
    return null;
  }

  function cleanHamiTitle(value) {
    return valueOf(value)
      .replace(/\s*-\s*(?:免費|線上|付費).*?\|\s*Hami\s*Video\s*$/iu, "")
      .replace(/\s*\|\s*Hami\s*Video\s*$/iu, "")
      .trim();
  }

  function isGenericTitle(title) {
    if (!title) return true;
    const normalized = title.trim().toLowerCase();
    const genericTerms = [
      "netflix", "disney+", "disneyplus", "hami video", "hami",
      "home", "首頁", "主頁", "browse", "瀏覽", "for you", "為你推薦"
    ];
    return genericTerms.includes(normalized);
  }

  function textOf(element) {
    return valueOf(element?.textContent);
  }

  function valueOf(value) {
    return String(value || "").replace(/\s+/gu, " ").trim();
  }

  return { extractMetadata, extractDisneyPlus, extractHamiVideo, extractNetflix, firstYear };
});
