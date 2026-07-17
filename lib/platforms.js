(function initPlatforms(root) {
  "use strict";

  const platforms = Object.freeze([
    {
      id: "mal",
      label: "MyAnimeList",
      homepage: "https://myanimelist.net/",
      category: "tracking",
      region: "Global / English",
      description: "收藏進度、評分、評論與排行榜",
      defaultEnabled: true
    },
    {
      id: "anilist",
      label: "AniList",
      homepage: "https://anilist.co/",
      category: "tracking",
      region: "Global / English",
      description: "收藏進度、統計、評分與社群功能",
      defaultEnabled: true
    },
    {
      id: "bangumi",
      label: "Bangumi",
      homepage: "https://bgm.tv/",
      category: "tracking",
      region: "中文 / 日本作品",
      description: "收藏、標籤、評分與中文作品資料",
      defaultEnabled: true
    },
    {
      id: "kitsu",
      label: "Kitsu",
      homepage: "https://kitsu.app/",
      category: "tracking",
      region: "Global / English",
      description: "收藏進度、評分與社群動態",
      defaultEnabled: true
    },
    {
      id: "animeplanet",
      label: "Anime-Planet",
      homepage: "https://www.anime-planet.com/",
      category: "tracking",
      region: "Global / English",
      description: "收藏、推薦、評論與作品排行",
      defaultEnabled: false
    },
    {
      id: "anidb",
      label: "AniDB",
      homepage: "https://anidb.net/",
      category: "tracking",
      region: "Global / Multilingual",
      description: "詳細版本資料、MyList、評分與評論",
      defaultEnabled: false
    },
    {
      id: "annict",
      label: "Annict",
      homepage: "https://annict.com/",
      category: "tracking",
      region: "日本語",
      description: "日本動畫觀看進度與每集記錄",
      defaultEnabled: false
    },
    {
      id: "simkl",
      label: "Simkl",
      homepage: "https://simkl.com/",
      category: "tracking",
      region: "Global / English",
      description: "動畫、影集與電影的跨媒體追蹤",
      defaultEnabled: false
    },
    {
      id: "livechart",
      label: "LiveChart",
      homepage: "https://www.livechart.me/",
      category: "tracking",
      region: "Global / English",
      description: "季度表、播出提醒、觀看狀態與社群評分",
      defaultEnabled: false
    },
    {
      id: "filmarks",
      label: "Filmarks Anime",
      homepage: "https://filmarks.com/animes",
      category: "ratings",
      region: "日本語",
      description: "日本使用者的五星評分、感想與滿意度排行",
      defaultEnabled: false
    },
    {
      id: "anikore",
      label: "あにこれ (AniKore)",
      homepage: "https://www.anikore.jp/",
      category: "ratings",
      region: "日本語",
      description: "日本動畫評論、成分評價與綜合排行",
      defaultEnabled: false
    },
    {
      id: "imdb",
      label: "IMDb",
      homepage: "https://www.imdb.com/",
      category: "ratings",
      region: "Global / General audience",
      description: "跨影視受眾的評分與評論；季度劃分可能與 MAL 不同",
      defaultEnabled: false
    }
  ]);

  const streamingPlatforms = Object.freeze([
    {
      id: "animegamer",
      label: "巴哈姆特動畫瘋",
      homepage: "https://ani.gamer.com.tw/",
      region: "台灣 / 繁體中文",
      description: "以作品標題開啟動畫瘋搜尋，確認目前是否上架",
      defaultEnabled: true
    },
    {
      id: "netflix",
      label: "Netflix",
      homepage: "https://www.netflix.com/",
      region: "Global / Taiwan",
      description: "以作品標題開啟 Netflix 搜尋；結果受帳號與地區影響",
      defaultEnabled: true
    },
    {
      id: "hamivideo",
      label: "Hami Video",
      homepage: "https://hamivideo.hinet.net/",
      region: "台灣 / 繁體中文",
      description: "以作品標題開啟 Hami Video 搜尋，確認目前是否上架",
      defaultEnabled: false
    }
  ]);

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
    mergedStreamingVisibility,
    mergedVisibility,
    platforms,
    streamingPlatforms
  };
})(globalThis);
