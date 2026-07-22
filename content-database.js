(function initDatabasePage() {
  "use strict";

  const { renderAnime, renderError, renderLoading } = AniBridgeUi;
  const t = (AniBridgeI18n || { t: (key) => key }).t;
  let currentKey = "";
  let currentData = null;

  checkPage();
  const observer = new MutationObserver(checkPage);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", checkPage);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && (changes.streamingVisibility || changes.platformVisibility) && currentData) showData(currentData);
  });

  async function checkPage() {
    const identity = pageIdentity();
    if (!identity || identity.key === currentKey) return;
    currentKey = identity.key;
    renderLoading(t("loadingFetchingTitles"));
    try {
      const response = await chrome.runtime.sendMessage({
        type: "lookupAnime",
        payload: { site: identity.site, id: identity.id }
      });
      if (!response?.ok) throw new Error(response?.error || t("unknownError"));
      currentData = response.data;
      await showData(currentData);
    } catch (error) {
      renderError(error instanceof Error ? error.message : String(error));
    }
  }

  async function showData(sourceData) {
    const { platformVisibility, streamingVisibility } = await chrome.storage.sync.get([
      "platformVisibility",
      "streamingVisibility"
    ]);
    const data = {
      ...sourceData,
      streamingLinks: (sourceData.streamingLinks || []).filter((link) =>
        AniBridgePlatforms.isStreamingEnabled(link.platformId, streamingVisibility)
      ),
      ratings: (sourceData.ratings || []).filter((rating) =>
        AniBridgePlatforms.isEnabled(rating.platformId, platformVisibility)
      )
    };
    renderAnime(data, {
        databasePage: true,
      });
  }

  function pageIdentity() {
    const mal = location.hostname === "myanimelist.net"
      ? location.pathname.match(/^\/anime\/(\d+)/u)
      : null;
    if (mal) return { site: "mal", id: Number(mal[1]), key: `mal:${mal[1]}` };

    const anilist = location.hostname === "anilist.co"
      ? location.pathname.match(/^\/anime\/(\d+)/u)
      : null;
    if (anilist) return { site: "anilist", id: Number(anilist[1]), key: `anilist:${anilist[1]}` };
    return null;
  }
})();
