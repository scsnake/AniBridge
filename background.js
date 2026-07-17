importScripts("lib/matcher.js", "lib/platforms.js", "vendor/opencc-cn2t.js");

const {
  cleanSourceTitle,
  confidence,
  normalizeTitle,
  rankCandidates,
  yearFromDate
} = AniBridgeMatcher;

const CACHE_VERSION = 8;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_USABLE_SCORE = 0.46;
const toTraditional = OpenCC.Converter({ from: "cn", to: "twp" });

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return false;
  if (message.type === "openOptions") {
    chrome.runtime.openOptionsPage()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return true;
  }
  if (!["matchAnime", "lookupAnime"].includes(message.type)) return false;

  const task = message.type === "matchAnime"
    ? matchAnime(message.payload || {})
    : lookupAnime(message.payload || {});

  task.then(sendResponse).catch((error) => {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
  });
  return true;
});

async function matchAnime(payload, options = {}) {
  const title = cleanSourceTitle(payload.title);
  const year = Number(payload.year) || null;
  if (!title) throw new Error("找不到動畫標題");

  const cacheKey = `match:${normalizeTitle(title)}:${year || "unknown"}`;
  if (!options.skipCache) {
    const cached = await readCache(cacheKey);
    if (cached) return { ok: true, data: cached, cached: true };
  }

  const warnings = [];
  const bangumiCandidates = await safely(
    () => searchBangumi(title),
    warnings,
    "Bangumi 暫時無法查詢"
  );
  const rankedBangumi = rankCandidates(
    { title, year },
    bangumiCandidates.map((item) => ({
      raw: item,
      titles: [item.name, item.name_cn],
      year: yearFromDate(item.date),
      format: null
    }))
  );
  const bangumiMatch = isUsableBridge(rankedBangumi[0], year) ? rankedBangumi[0] : null;

  const bridgeTitle = bangumiMatch?.raw.name || title;
  const anilistCandidates = await safely(
    () => searchAniList(bridgeTitle),
    warnings,
    "AniList 暫時無法查詢"
  );
  const rankedAniList = rankCandidates(
    { title: bridgeTitle, year },
    anilistCandidates.map((item) => ({
      raw: item,
      titles: [item.title?.native, item.title?.romaji, item.title?.english, ...(item.synonyms || [])],
      year: item.startDate?.year || item.seasonYear,
      format: item.format
    }))
  );
  const anilistMatch = rankedAniList[0]?.score >= MIN_USABLE_SCORE
    ? rankedAniList[0]
    : null;

  const scores = [bangumiMatch?.score, anilistMatch?.score].filter(Number.isFinite);
  const overallScore = scores.length ? Math.max(...scores) : 0;
  const data = buildResult({
    sourceTitle: title,
    year,
    bangumiMatch,
    anilistMatch,
    warnings,
    overallScore
  });

  await writeCache(cacheKey, data);
  await cacheByExternalIds(data);
  return { ok: true, data, cached: false };
}

async function lookupAnime(payload) {
  const site = String(payload.site || "");
  const id = Number(payload.id);
  if (!id || !["mal", "anilist"].includes(site)) throw new Error("無效的資料庫作品 ID");

  const externalKey = `external:${site}:${id}`;
  const cached = await readCache(externalKey);
  if (cached) return { ok: true, data: cached, cached: true };

  const warnings = [];
  const anime = await safely(
    () => getAniListMedia(site, id),
    warnings,
    "AniList 暫時無法查詢"
  );
  if (!anime) throw new Error("找不到這部動畫的跨站資料");

  const year = anime.startDate?.year || anime.seasonYear || null;
  const japanese = anime.title?.native || anime.title?.romaji;
  const bangumiCandidates = await safely(
    () => searchBangumi(japanese),
    warnings,
    "Bangumi 暫時無法查詢"
  );
  const ranked = rankCandidates(
    { title: japanese, year },
    bangumiCandidates.map((item) => ({
      raw: item,
      titles: [item.name, item.name_cn],
      year: yearFromDate(item.date),
      format: null
    }))
  );
  const bangumiMatch = isUsableBridge(ranked[0], year) ? ranked[0] : null;

  const data = buildResult({
    sourceTitle: bangumiMatch?.raw.name_cn ? toTraditional(bangumiMatch.raw.name_cn) : anime.title?.english || japanese,
    year,
    bangumiMatch,
    anilistMatch: { raw: anime, score: 1 },
    warnings,
    overallScore: bangumiMatch ? Math.min(1, 0.78 + bangumiMatch.score * 0.2) : 0.72
  });
  await cacheByExternalIds(data);
  return { ok: true, data, cached: false };
}

function buildResult({
  sourceTitle,
  year,
  bangumiMatch,
  anilistMatch,
  warnings,
  overallScore
}) {
  const bangumi = bangumiMatch?.raw || null;
  const anilist = anilistMatch?.raw || null;
  const zhtw = sourceTitle || (bangumi?.name_cn ? toTraditional(bangumi.name_cn) : null);
  const japanese = bangumi?.name || anilist?.title?.native || null;
  const english = anilist?.title?.english || null;
  const romaji = anilist?.title?.romaji || null;
  const globalSearchTitle = english || romaji || japanese || sourceTitle;
  const japaneseSearchTitle = japanese || globalSearchTitle;
  const officialWebsite = findOfficialWebsite(anilist?.externalLinks);
  const streamingSearchTitle = zhtw || english || romaji || japanese || sourceTitle;
  const ratings = buildRatings({ bangumi, bangumiMatch, anilist, anilistMatch });

  return {
    version: CACHE_VERSION,
    sourceTitle,
    year,
    translations: {
      zhtw,
      japanese,
      english,
      romaji
    },
    confidence: confidence(overallScore),
    score: Number(overallScore.toFixed(3)),
    officialWebsite,
    ratings,
    streamingLinks: [
      searchLink(
        "animegamer",
        "巴哈姆特動畫瘋",
        `https://ani.gamer.com.tw/search.php?keyword=${encodeURIComponent(streamingSearchTitle)}`,
        "streaming"
      ),
      searchLink(
        "netflix",
        "Netflix",
        `https://www.netflix.com/search?q=${encodeURIComponent(streamingSearchTitle)}`,
        "streaming"
      ),
      searchLink(
        "hamivideo",
        "Hami Video",
        `https://hamivideo.hinet.net/search.do?keyword=${encodeURIComponent(streamingSearchTitle)}`,
        "streaming"
      )
    ],
    links: [
      makeLink(
        "mal",
        "MyAnimeList",
        anilist?.idMal ? `https://myanimelist.net/anime/${anilist.idMal}` : null,
        `https://myanimelist.net/anime.php?q=${encodeURIComponent(anilist?.title?.romaji || sourceTitle)}&cat=anime`,
        Boolean(anilist?.idMal && anilistMatch?.score >= 0.55)
      ),
      makeLink(
        "anilist",
        "AniList",
        anilist?.siteUrl || (anilist?.id ? `https://anilist.co/anime/${anilist.id}` : null),
        `https://anilist.co/search/anime?search=${encodeURIComponent(sourceTitle)}`,
        Boolean(anilist?.id && anilistMatch?.score >= 0.55)
      ),
      makeLink(
        "bangumi",
        "Bangumi",
        bangumi?.id ? `https://bgm.tv/subject/${bangumi.id}` : null,
        `https://bgm.tv/subject_search/${encodeURIComponent(sourceTitle)}?cat=2`,
        Boolean(bangumi?.id && bangumiMatch?.score >= 0.55)
      ),
      makeLink(
        "kitsu",
        "Kitsu",
        null,
        `https://kitsu.app/anime?text=${encodeURIComponent(sourceTitle)}`,
        false
      ),
      searchLink("animeplanet", "Anime-Planet", `https://www.anime-planet.com/anime/all?name=${encodeURIComponent(globalSearchTitle)}`),
      searchLink("anidb", "AniDB", `https://anidb.net/search/anime/?adb.search=${encodeURIComponent(globalSearchTitle)}&do.search=1`),
      searchLink("annict", "Annict", `https://annict.com/search?q=${encodeURIComponent(japaneseSearchTitle)}`),
      searchLink("simkl", "Simkl", `https://simkl.com/search/?q=${encodeURIComponent(globalSearchTitle)}`),
      searchLink("livechart", "LiveChart", `https://www.livechart.me/search?q=${encodeURIComponent(globalSearchTitle)}`),
      searchLink("filmarks", "Filmarks Anime", `https://filmarks.com/search/animes?q=${encodeURIComponent(japaneseSearchTitle)}`, "ratings"),
      searchLink("anikore", "あにこれ", `https://www.anikore.jp/anime_title/${encodeURIComponent(japaneseSearchTitle)}/`, "ratings"),
      searchLink("imdb", "IMDb", `https://www.imdb.com/find/?q=${encodeURIComponent(globalSearchTitle)}&s=tt`, "ratings")
    ],
    ids: {
      mal: anilist?.idMal || null,
      anilist: anilist?.id || null,
      bangumi: bangumi?.id || null,
      kitsu: null
    },
    warnings
  };
}

function makeLink(platformId, label, exactUrl, fallbackUrl, exact) {
  const isExact = Boolean(exact && exactUrl);
  return { platformId, label, url: isExact ? exactUrl : fallbackUrl, exact: isExact, category: "tracking" };
}

function searchLink(platformId, label, url, category = "tracking") {
  return { platformId, label, url, exact: false, category };
}

function buildRatings({ bangumi, bangumiMatch, anilist, anilistMatch }) {
  const ratings = [];
  if (isExactMatch(anilistMatch) && Number.isFinite(anilist?.averageScore)) {
    const rank = preferredAniListRank(anilist.rankings);
    ratings.push({
      platformId: "anilist",
      label: "AniList",
      score: anilist.averageScore,
      scale: 100,
      detail: Number.isFinite(anilist.popularity) ? `加入清單 ${anilist.popularity.toLocaleString("en-US")} 人` : null,
      rank: rank ? `#${rank.rank.toLocaleString("en-US")}${rank.allTime ? " 歷年" : ""}` : null,
      url: anilist.siteUrl || `https://anilist.co/anime/${anilist.id}`
    });
  }
  if (isExactMatch(bangumiMatch) && Number.isFinite(bangumi?.rating?.score) && bangumi.rating.score > 0) {
    ratings.push({
      platformId: "bangumi",
      label: "Bangumi",
      score: bangumi.rating.score,
      scale: 10,
      detail: Number.isFinite(bangumi.rating.total) ? `${bangumi.rating.total.toLocaleString("en-US")} 則評分` : null,
      rank: Number.isFinite(bangumi.rating.rank) && bangumi.rating.rank > 0
        ? `#${bangumi.rating.rank.toLocaleString("en-US")}`
        : null,
      url: `https://bgm.tv/subject/${bangumi.id}`
    });
  }
  return ratings;
}

function isExactMatch(match) {
  return Boolean(match?.raw && Number(match.score) >= 0.55);
}

function preferredAniListRank(rankings) {
  const values = Array.isArray(rankings) ? rankings.filter((item) => Number.isFinite(item?.rank)) : [];
  return values.find((item) => item.allTime && item.type === "RATED")
    || values.find((item) => item.type === "RATED")
    || values.find((item) => item.allTime)
    || values[0]
    || null;
}

async function searchBangumi(keyword) {
  const response = await fetch("https://api.bgm.tv/v0/search/subjects?limit=10&offset=0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ keyword, filter: { type: [2] } })
  });
  if (!response.ok) throw new Error(`Bangumi HTTP ${response.status}`);
  const body = await response.json();
  return Array.isArray(body.data) ? body.data : [];
}

async function searchAniList(search) {
  const query = `
    query ($search: String!) {
      Page(perPage: 8) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id idMal siteUrl seasonYear synonyms format episodes duration
          averageScore meanScore popularity favourites
          rankings { rank type allTime }
          startDate { year month day }
          title { romaji english native }
          externalLinks { site url type language isDisabled }
        }
      }
    }
  `;
  const data = await fetchAniList(query, { search });
  return data?.Page?.media || [];
}

async function getAniListMedia(site, id) {
  const argument = site === "mal" ? "idMal" : "id";
  const query = `
    query ($id: Int!) {
      Media(${argument}: $id, type: ANIME) {
        id idMal siteUrl seasonYear synonyms format episodes duration
        averageScore meanScore popularity favourites
        rankings { rank type allTime }
        startDate { year month day }
        title { romaji english native }
        externalLinks { site url type language isDisabled }
      }
    }
  `;
  const data = await fetchAniList(query, { id });
  return data?.Media || null;
}

async function fetchAniList(query, variables) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message || "AniList query error");
  return body.data;
}

function findOfficialWebsite(externalLinks) {
  const candidates = Array.isArray(externalLinks) ? externalLinks : [];
  const link = candidates.find((item) =>
    !item?.isDisabled
      && item.type === "INFO"
      && /^official\s+(?:site|website)$/iu.test(item.site || "")
      && isHttpUrl(item.url)
  );
  if (!link) return null;
  return {
    label: link.language ? `官方網站 · ${link.language}` : "官方網站",
    url: link.url
  };
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch (_error) {
    return false;
  }
}

function isUsableBridge(candidate, expectedYear) {
  if (!candidate) return false;
  if (candidate.score >= MIN_USABLE_SCORE) return true;
  const candidateYear = Number(candidate.year) || null;
  return Boolean(
    expectedYear
      && candidateYear === Number(expectedYear)
      && candidate.score >= 0.3
  );
}

async function safely(operation, warnings, warning) {
  try {
    return await operation();
  } catch (error) {
    warnings.push(`${warning}：${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function readCache(key) {
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key];
  if (!entry || entry.version !== CACHE_VERSION || Date.now() - entry.savedAt > CACHE_TTL_MS) {
    if (entry) await chrome.storage.local.remove(key);
    return null;
  }
  return entry.data;
}

async function writeCache(key, data) {
  await chrome.storage.local.set({
    [key]: { version: CACHE_VERSION, savedAt: Date.now(), data }
  });
}

async function cacheByExternalIds(data) {
  const entries = {};
  for (const site of ["mal", "anilist"]) {
    const id = data.ids?.[site];
    if (id) {
      entries[`external:${site}:${id}`] = {
        version: CACHE_VERSION,
        savedAt: Date.now(),
        data
      };
    }
  }
  if (Object.keys(entries).length) await chrome.storage.local.set(entries);
}
