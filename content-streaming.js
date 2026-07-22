(function initStreamingPage() {
  "use strict";

  const { renderAnime, renderError, renderLoading } = AniBridgeUi;
  const t = (AniBridgeI18n || { t: (key) => key }).t;
  let currentKey = "";
  let currentData = null;
  let currentPayload = null;
  let checkTimer = null;

  scheduleCheck();
  const observer = new MutationObserver(scheduleCheck);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleCheck);
  window.addEventListener("hashchange", scheduleCheck);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.platformVisibility && currentData) showData(currentData);
  });

  function scheduleCheck() {
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(checkPage, 120);
  }

  function checkPage() {
    const metadata = AniBridgeStreamingAdapters.extractMetadata(document, location);
    if (!metadata || !metadata.title || !metadata.workKey) {
      if (currentKey !== "") {
        currentKey = "";
        currentData = null;
        currentPayload = null;
        AniBridgeUi.removePanel();
      }
      return;
    }
    if (metadata.workKey === currentKey) return;
    currentKey = metadata.workKey;
    currentPayload = metadata;
    runMatch(metadata, currentKey);
  }

  async function runMatch(payload, requestKey) {
    renderLoading(t("loadingMatchingDatabase"), { collapsible: true });
    try {
      const response = await chrome.runtime.sendMessage({ type: "matchAnime", payload });
      if (requestKey !== currentKey) return;
      if (!response?.ok) throw new Error(response?.error || t("unknownError"));
      currentData = response.data;
      await showData(currentData, requestKey);
    } catch (error) {
      if (requestKey !== currentKey) return;
      renderError(error instanceof Error ? error.message : String(error), { collapsible: true });
    }
  }

  async function showData(sourceData, requestKey = currentKey) {
    const data = await applyPlatformPreferences(sourceData);
    if (requestKey !== currentKey) return;
    const aiState = !data.aiAssisted && needsAiAssist(data)
      ? await AniBridgeLocalAi.availability()
      : "unavailable";
    renderAnime(data, {
      onCorrect: (correction) => {
        currentPayload = correction;
        runMatch(correction, currentKey);
      },
      onAiAssist: aiState === "unavailable" ? null : runAiAssist,
      onOptions: () => chrome.runtime.sendMessage({ type: "openOptions" }),
      collapsible: true
    });
  }

  function needsAiAssist(data) {
    return !data.translations?.japanese || !data.ids?.anilist;
  }

  async function runAiAssist() {
    const payload = currentPayload;
    const requestKey = currentKey;
    const previousData = currentData;
    if (!payload?.title) return;

    renderLoading(t("loadingAiAlias"), { collapsible: true });
    try {
      const aliases = await AniBridgeLocalAi.suggestAliases(payload);
      const data = await AniBridgeLocalAi.verifyAliases(aliases, payload, (candidate) =>
        chrome.runtime.sendMessage({ type: "matchAnime", payload: candidate })
      );
      if (requestKey !== currentKey) return;
      currentData = data;
      await showData(currentData, requestKey);
    } catch (error) {
      if (requestKey !== currentKey) return;
      const message = error instanceof Error ? error.message : String(error);
      if (previousData) {
        currentData = {
          ...previousData,
          warnings: [...(previousData.warnings || []), t("warningLocalAiFailed", [message])]
        };
        await showData(currentData, requestKey);
      } else {
        renderError(message, { collapsible: true });
      }
    }
  }

  async function applyPlatformPreferences(data) {
    const { platformVisibility } = await chrome.storage.sync.get("platformVisibility");
    return {
      ...data,
      links: (data.links || []).filter((link) =>
        AniBridgePlatforms.isEnabled(link.platformId, platformVisibility)
      ),
      ratings: (data.ratings || []).filter((rating) =>
        AniBridgePlatforms.isEnabled(rating.platformId, platformVisibility)
      )
    };
  }
})();
