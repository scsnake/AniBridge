(function initMatcher(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AniBridgeMatcher = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function matcherFactory() {
  "use strict";

  const EPISODE_SUFFIXES = [
    /\s*[\[【(（]\s*\d+(?:\.\d+)?\s*[\]】)）]\s*$/u,
    /\s*[\[【(（](?:中文配音|國語配音|日語配音|雙語|付費會員)[\]】)）]\s*$/gu,
    /\s*(?:第\s*)?\d+(?:\.\d+)?\s*(?:集|話)\s*$/u,
    /\s*線上看(?:\s*[-–—|].*)?$/u,
    /\s*[-–—|]\s*巴哈姆特動畫瘋\s*$/u
  ];

  function cleanSourceTitle(value) {
    let title = String(value || "")
      .replace(/\s+/gu, " ")
      .trim();

    let previous;
    do {
      previous = title;
      for (const pattern of EPISODE_SUFFIXES) title = title.replace(pattern, "").trim();
    } while (title !== previous);

    return title;
  }

  function normalizeTitle(value) {
    return cleanSourceTitle(value)
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .replace(/[\p{P}\p{S}\s]/gu, "");
  }

  function bigrams(value) {
    const chars = Array.from(value);
    if (chars.length < 2) return chars;
    const output = [];
    for (let index = 0; index < chars.length - 1; index += 1) {
      output.push(chars[index] + chars[index + 1]);
    }
    return output;
  }

  function diceSimilarity(left, right) {
    const a = normalizeTitle(left);
    const b = normalizeTitle(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) {
      return Math.min(a.length, b.length) / Math.max(a.length, b.length);
    }

    const aPairs = bigrams(a);
    const bCounts = new Map();
    for (const pair of bigrams(b)) bCounts.set(pair, (bCounts.get(pair) || 0) + 1);

    let overlap = 0;
    for (const pair of aPairs) {
      const count = bCounts.get(pair) || 0;
      if (count > 0) {
        overlap += 1;
        bCounts.set(pair, count - 1);
      }
    }
    return (2 * overlap) / (aPairs.length + bigrams(b).length);
  }

  function yearFromDate(value) {
    const match = String(value || "").match(/(?:19|20)\d{2}/u);
    return match ? Number(match[0]) : null;
  }

  function titleSignals(value) {
    const title = String(value || "").normalize("NFKC").toLocaleLowerCase("en");
    let format = null;
    if (/(?:劇場版|电影版|電影版|映画|\bmovie\b|\bfilm\b)/u.test(title)) format = "MOVIE";
    else if (/(?:\bova\b|\boad\b|原創動畫錄影帶|原创动画录影带)/u.test(title)) format = "OVA";
    else if (/(?:特別篇|特别篇|番外篇|\bspecial\b)/u.test(title)) format = "SPECIAL";

    const chineseNumbers = {
      一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10
    };
    const seasonPatterns = [
      /第\s*([一二三四五六七八九十\d]+)\s*(?:季|期|章|部)/u,
      /(?:season|part)\s*([\d]+)/u,
      /([\d]+)(?:st|nd|rd|th)\s+season/u,
      /\bS\s*([\d]+)\b/iu,
      /\b([2-9])\s*期\b/u
    ];
    let season = null;
    for (const pattern of seasonPatterns) {
      const match = title.match(pattern);
      if (!match) continue;
      season = Number(match[1]) || chineseNumbers[match[1]] || null;
      if (season) break;
    }

    return { format, season };
  }

  function scoreCandidate(query, candidate) {
    const titles = (candidate.titles || []).filter(Boolean);
    const titleScore = titles.reduce(
      (best, title) => Math.max(best, diceSimilarity(query.title, title)),
      0
    );

    let score = titleScore * 0.78;
    const queryYear = Number(query.year) || null;
    const candidateYear = Number(candidate.year) || null;
    if (queryYear && candidateYear) {
      const difference = Math.abs(queryYear - candidateYear);
      if (difference === 0) score += 0.14;
      else if (difference === 1) score += 0.05;
      else score -= Math.min(0.22, difference * 0.04);
    }

    const querySignals = titleSignals(query.title);
    const candidateSignals = titles.reduce(
      (signals, title) => {
        const next = titleSignals(title);
        return {
          format: signals.format || next.format,
          season: signals.season || next.season
        };
      },
      { format: null, season: null }
    );
    candidateSignals.format = candidate.format || candidateSignals.format;

    if (querySignals.format && candidateSignals.format) {
      score += querySignals.format === candidateSignals.format ? 0.08 : -0.22;
    }
    if (querySignals.season && candidateSignals.season) {
      score += querySignals.season === candidateSignals.season ? 0.08 : -0.2;
    }
    return Math.max(0, Math.min(1, score));
  }

  function rankCandidates(query, candidates) {
    return candidates
      .map((candidate) => ({ ...candidate, score: scoreCandidate(query, candidate) }))
      .sort((left, right) => right.score - left.score);
  }

  function confidence(score) {
    if (score >= 0.78) return "high";
    if (score >= 0.55) return "medium";
    return "low";
  }

  return {
    cleanSourceTitle,
    confidence,
    diceSimilarity,
    normalizeTitle,
    rankCandidates,
    scoreCandidate,
    titleSignals,
    yearFromDate
  };
});
