(function initLocalAi(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AniBridgeLocalAi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function localAiFactory() {
  "use strict";

  function t(key, substitutions) {
    const api = typeof chrome !== "undefined" ? chrome.i18n : null;
    if (api && typeof api.getMessage === "function") {
      const value = substitutions === undefined
        ? api.getMessage(key)
        : api.getMessage(key, substitutions);
      if (value) return value;
    }
    const args = Array.isArray(substitutions) ? substitutions : substitutions ? [substitutions] : [];
    return args.length ? `${key}: ${args.join(", ")}` : key;
  }

  async function availability(languageModel = globalThis.LanguageModel) {
    if (!languageModel?.availability || !languageModel?.create) return "unavailable";
    try {
      return await languageModel.availability();
    } catch (_error) {
      return "unavailable";
    }
  }

  async function suggestAliases(payload, languageModel = globalThis.LanguageModel) {
    if (!languageModel?.create) throw new Error(t("errorLocalAiUnavailable"));
    // This call happens synchronously from the card button's click handler.
    // Chrome requires that model creation/download begins with user activation.
    const sessionPromise = languageModel.create();
    const session = await sessionPromise;
    try {
      const response = await session.prompt(`
You suggest search aliases for one anime or animation title. Return JSON only in
the form {"aliases":["..."]}. Provide at most three likely aliases in Japanese,
Romaji, or English. Do not provide database IDs, URLs, explanations, or invented
facts. This output is only a search hint and will be independently verified.

Source title: ${JSON.stringify(String(payload.title || ""))}
Release year: ${Number(payload.year) || "unknown"}
      `.trim());
      return parseAliases(response, payload.title);
    } finally {
      session.destroy?.();
    }
  }

  function parseAliases(response, sourceTitle) {
    let parsed;
    try {
      parsed = JSON.parse(String(response || ""));
    } catch (_error) {
      throw new Error(t("errorLocalAiFormat"));
    }
    const sourceKey = normalize(sourceTitle);
    const aliases = Array.isArray(parsed?.aliases) ? parsed.aliases : [];
    const unique = new Set();
    for (const value of aliases) {
      const title = String(value || "").replace(/\s+/gu, " ").trim();
      const key = normalize(title);
      if (!title || title.length > 160 || !key || key === sourceKey) continue;
      unique.add(title);
      if (unique.size === 3) break;
    }
    if (!unique.size) throw new Error(t("errorLocalAiNoAlias"));
    return [...unique];
  }

  async function verifyAliases(aliases, sourcePayload, match) {
    const verified = [];
    for (const alias of aliases) {
      try {
        const response = await match({ ...sourcePayload, title: alias });
        const data = response?.ok ? response.data : null;
        if (data?.ids?.anilist) {
          verified.push({ alias, data });
        }
      } catch (_error) {
        // One malformed/hallucinated alias must not prevent other candidates.
      }
    }
    if (!verified.length) throw new Error(t("errorLocalAiNoMatch"));

    verified.sort((left, right) => Number(right.data.score || 0) - Number(left.data.score || 0));
    const best = verified[0];
    return {
      ...best.data,
      sourceTitle: sourcePayload.title,
      year: Number(sourcePayload.year) || best.data.year || null,
      translations: {
        ...(best.data.translations || {}),
        zhtw: sourcePayload.title || best.data.translations?.zhtw || null
      },
      // An AI alias is a hint. Never show it as a high-confidence automatic match.
      confidence: "medium",
      warnings: [
        ...(best.data.warnings || []),
        t("warningLocalAiAlias", [best.alias])
      ],
      aiAssisted: true
    };
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .replace(/[\p{P}\p{S}\s]/gu, "");
  }

  return { availability, parseAliases, suggestAliases, verifyAliases };
});
