(function initGamerPage() {
  "use strict";

  const { renderAnime, renderError, renderLoading } = AniBridgeUi;
  const metadata = extractMetadata();
  let currentData = null;
  if (!metadata.title) return;

  runMatch(metadata);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === "sync"
      && changes.platformVisibility
      && currentData
    ) showData(currentData);
  });

  async function runMatch(payload) {
    renderLoading("正在比對動畫資料庫", { collapsible: true });
    try {
      const response = await chrome.runtime.sendMessage({ type: "matchAnime", payload });
      if (!response?.ok) throw new Error(response?.error || "未知錯誤");
      currentData = response.data;
      await showData(currentData);
    } catch (error) {
      renderError(error instanceof Error ? error.message : String(error), { collapsible: true });
    }
  }

  async function showData(sourceData) {
    const data = await applyPlatformPreferences(sourceData);
    renderAnime(data, {
      onCorrect: runMatch,
      onOptions: () => chrome.runtime.sendMessage({ type: "openOptions" }),
      collapsible: true
    });
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

  function extractMetadata() {
    const headingSelectors = [
      ".anime-title h1",
      ".anime_name h1",
      ".anime_name",
      "main h1",
      "h1"
    ];
    let title = "";
    for (const selector of headingSelectors) {
      const value = document.querySelector(selector)?.textContent?.trim();
      if (value && !/請完成下列動作|系統異常/u.test(value)) {
        title = value;
        break;
      }
    }
    if (!title) {
      title = document.querySelector('meta[property="og:title"]')?.content
        || document.title
        || "";
    }

    const pageText = document.body?.innerText || "";
    const dateMatch = pageText.match(/首播日期\s*[:：]?\s*((?:19|20)\d{2})[/.\-年]/u);
    return {
      title,
      year: dateMatch ? Number(dateMatch[1]) : null,
      sourceUrl: location.href
    };
  }
})();
