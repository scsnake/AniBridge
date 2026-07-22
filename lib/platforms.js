(function initPlatforms(root) {
  "use strict";

  function t(key, fallback) {
    const api = typeof chrome !== "undefined" ? chrome.i18n : null;
    if (api && typeof api.getMessage === "function") {
      const value = api.getMessage(key);
      if (value) return value;
    }
    return fallback;
  }

  const platformSources = [
    {
      id: "mal",
      labelKey: "platformMalLabel",
      labelFallback: "MyAnimeList",
      homepage: "https://myanimelist.net/",
      category: "tracking",
      regionKey: "regionGlobalEnglish",
      regionFallback: "Global / English",
      descriptionKey: "platformMalDescription",
      descriptionFallback: "Progress, ratings, reviews, and rankings",
      defaultEnabled: true
    },
    {
      id: "anilist",
      labelKey: "platformAnilistLabel",
      labelFallback: "AniList",
      homepage: "https://anilist.co/",
      category: "tracking",
      regionKey: "regionGlobalEnglish",
      regionFallback: "Global / English",
      descriptionKey: "platformAnilistDescription",
      descriptionFallback: "Progress, stats, ratings, and social features",
      defaultEnabled: true
    },
    {
      id: "bangumi",
      labelKey: "platformBangumiLabel",
      labelFallback: "Bangumi",
      homepage: "https://bgm.tv/",
      category: "tracking",
      regionKey: "regionZhJp",
      regionFallback: "Chinese / Japanese titles",
      descriptionKey: "platformBangumiDescription",
      descriptionFallback: "Collection, tags, ratings, and Chinese metadata",
      defaultEnabled: true
    },
    {
      id: "kitsu",
      labelKey: "platformKitsuLabel",
      labelFallback: "Kitsu",
      homepage: "https://kitsu.app/",
      category: "tracking",
      regionKey: "regionGlobalEnglish",
      regionFallback: "Global / English",
      descriptionKey: "platformKitsuDescription",
      descriptionFallback: "Progress, ratings, and community activity",
      defaultEnabled: true
    },
    {
      id: "animeplanet",
      labelKey: "platformAnimeplanetLabel",
      labelFallback: "Anime-Planet",
      homepage: "https://www.anime-planet.com/",
      category: "tracking",
      regionKey: "regionGlobalEnglish",
      regionFallback: "Global / English",
      descriptionKey: "platformAnimeplanetDescription",
      descriptionFallback: "Collection, recommendations, reviews, and rankings",
      defaultEnabled: false
    },
    {
      id: "anidb",
      labelKey: "platformAnidbLabel",
      labelFallback: "AniDB",
      homepage: "https://anidb.net/",
      category: "tracking",
      regionKey: "regionGlobalMulti",
      regionFallback: "Global / Multilingual",
      descriptionKey: "platformAnidbDescription",
      descriptionFallback: "Detailed release data, MyList, ratings, and reviews",
      defaultEnabled: false
    },
    {
      id: "annict",
      labelKey: "platformAnnictLabel",
      labelFallback: "Annict",
      homepage: "https://annict.com/",
      category: "tracking",
      regionKey: "regionJapanese",
      regionFallback: "Japanese",
      descriptionKey: "platformAnnictDescription",
      descriptionFallback: "Japanese anime watch progress and per-episode tracking",
      defaultEnabled: false
    },
    {
      id: "simkl",
      labelKey: "platformSimklLabel",
      labelFallback: "Simkl",
      homepage: "https://simkl.com/",
      category: "tracking",
      regionKey: "regionGlobalEnglish",
      regionFallback: "Global / English",
      descriptionKey: "platformSimklDescription",
      descriptionFallback: "Cross-media tracking for anime, shows, and movies",
      defaultEnabled: false
    },
    {
      id: "livechart",
      labelKey: "platformLivechartLabel",
      labelFallback: "LiveChart",
      homepage: "https://www.livechart.me/",
      category: "tracking",
      regionKey: "regionGlobalEnglish",
      regionFallback: "Global / English",
      descriptionKey: "platformLivechartDescription",
      descriptionFallback: "Seasonal chart, air-time reminders, watch status, and community ratings",
      defaultEnabled: false
    },
    {
      id: "filmarks",
      labelKey: "platformFilmarksLabel",
      labelFallback: "Filmarks Anime",
      homepage: "https://filmarks.com/animes",
      category: "ratings",
      regionKey: "regionJapanese",
      regionFallback: "Japanese",
      descriptionKey: "platformFilmarksDescription",
      descriptionFallback: "Japanese five-star ratings, reviews, and satisfaction rankings",
      defaultEnabled: false
    },
    {
      id: "anikore",
      labelKey: "platformAnikoreLabel",
      labelFallback: "Anikore (あにこれ)",
      homepage: "https://www.anikore.jp/",
      category: "ratings",
      regionKey: "regionJapanese",
      regionFallback: "Japanese",
      descriptionKey: "platformAnikoreDescription",
      descriptionFallback: "Japanese anime reviews, trait scoring, and overall rankings",
      defaultEnabled: false
    },
    {
      id: "imdb",
      labelKey: "platformImdbLabel",
      labelFallback: "IMDb",
      homepage: "https://www.imdb.com/",
      category: "ratings",
      regionKey: "regionGlobalGeneral",
      regionFallback: "Global / General audience",
      descriptionKey: "platformImdbDescription",
      descriptionFallback: "Ratings and reviews from a general film & TV audience",
      defaultEnabled: false
    }
  ];

  const streamingPlatformSources = [
    {
      id: "animegamer",
      labelKey: "platformAnimegamerLabel",
      labelFallback: "Ani-Gamer",
      homepage: "https://ani.gamer.com.tw/",
      regionKey: "regionTaiwanZhTw",
      regionFallback: "Taiwan / Traditional Chinese",
      descriptionKey: "platformAnimegamerDescription",
      descriptionFallback: "Search Ani-Gamer by title to check current availability",
      defaultEnabled: true
    },
    {
      id: "netflix",
      labelKey: "platformNetflixLabel",
      labelFallback: "Netflix",
      homepage: "https://www.netflix.com/",
      regionKey: "regionGlobalTaiwan",
      regionFallback: "Global / Taiwan",
      descriptionKey: "platformNetflixDescription",
      descriptionFallback: "Search Netflix by title; results depend on account and region",
      defaultEnabled: true
    },
    {
      id: "hamivideo",
      labelKey: "platformHamivideoLabel",
      labelFallback: "Hami Video",
      homepage: "https://hamivideo.hinet.net/",
      regionKey: "regionTaiwanZhTw",
      regionFallback: "Taiwan / Traditional Chinese",
      descriptionKey: "platformHamivideoDescription",
      descriptionFallback: "Search Hami Video by title to check current availability",
      defaultEnabled: false
    }
  ];

  function hydrate(source) {
    const hydrated = {
      id: source.id,
      label: t(source.labelKey, source.labelFallback),
      homepage: source.homepage,
      region: t(source.regionKey, source.regionFallback),
      description: t(source.descriptionKey, source.descriptionFallback),
      defaultEnabled: source.defaultEnabled
    };
    if (source.category) hydrated.category = source.category;
    return Object.freeze(hydrated);
  }

  const platforms = Object.freeze(platformSources.map(hydrate));
  const streamingPlatforms = Object.freeze(streamingPlatformSources.map(hydrate));

  function labelFor(platformId) {
    const source = platformSources.find((item) => item.id === platformId)
      || streamingPlatformSources.find((item) => item.id === platformId);
    return source ? t(source.labelKey, source.labelFallback) : platformId;
  }

  function defaultVisibility() {
    return Object.fromEntries(platforms.map((platform) => [platform.id, platform.defaultEnabled]));
  }

  function mergedVisibility(saved) {
    return { ...defaultVisibility(), ...(saved || {}) };
  }

  function isEnabled(platformId, saved) {
    return mergedVisibility(saved)[platformId] !== false;
  }

  function defaultStreamingVisibility() {
    return Object.fromEntries(streamingPlatforms.map((platform) => [platform.id, platform.defaultEnabled]));
  }

  function mergedStreamingVisibility(saved) {
    return { ...defaultStreamingVisibility(), ...(saved || {}) };
  }

  function isStreamingEnabled(platformId, saved) {
    return mergedStreamingVisibility(saved)[platformId] !== false;
  }

  root.AniBridgePlatforms = {
    defaultStreamingVisibility,
    defaultVisibility,
    isEnabled,
    isStreamingEnabled,
    labelFor,
    mergedStreamingVisibility,
    mergedVisibility,
    platforms,
    streamingPlatforms
  };
})(globalThis);
