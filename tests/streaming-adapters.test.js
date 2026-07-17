const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractMetadata,
  firstYear
} = require("../lib/streaming-adapters.js");

function documentWith(selectors) {
  return {
    querySelector(selector) {
      return selectors[selector] || null;
    }
  };
}

test("extracts Disney+ parent title and entity ID without using episode metadata", () => {
  const document = documentWith({
    '[data-testid="details-title-treatment"] img[alt]': { alt: "Medalist" },
    '[data-testid="masthead-metadata"]': { textContent: "2025 – 2026 • 2 Seasons • Drama, Animation" }
  });
  const metadata = extractMetadata(document, {
    hostname: "www.disneyplus.com",
    pathname: "/browse/entity-bbd81eb3-3487-4520-b463-129f6c0e0585",
    href: "https://www.disneyplus.com/browse/entity-bbd81eb3-3487-4520-b463-129f6c0e0585"
  });

  assert.deepEqual(metadata, {
    provider: "disneyplus",
    workKey: "disneyplus:bbd81eb3-3487-4520-b463-129f6c0e0585",
    title: "Medalist",
    year: 2025,
    sourceUrl: "https://www.disneyplus.com/browse/entity-bbd81eb3-3487-4520-b463-129f6c0e0585"
  });
});

test("extracts Netflix title-page metadata from the reported logo", () => {
  const titleImage = { alt: "Delicious in Dungeon" };
  const details = {
    querySelector(selector) {
      return selector === "img.previewModal--player-titleTreatment-logo[alt]" ? titleImage : null;
    }
  };
  const document = documentWith({
    '[data-uia="previewModal--container"]': details,
    '[data-uia="videoMetadata--container"]': { textContent: "2024 • 16+ • 24m" }
  });
  const metadata = extractMetadata(document, {
    hostname: "www.netflix.com",
    pathname: "/title/81766594",
    href: "https://www.netflix.com/title/81766594"
  });

  assert.equal(metadata.title, "Delicious in Dungeon");
  assert.equal(metadata.year, 2024);
  assert.equal(metadata.workKey, "netflix:title:81766594");
});

test("extracts a Netflix browse-modal title from its jbv ID and semantic container", () => {
  const titleImage = { alt: "HUNTER×HUNTER" };
  const details = {
    querySelector(selector) {
      return selector === '[data-uia="previewModal--player_container"] img[alt]' ? titleImage : null;
    }
  };
  const document = documentWith({
    '[data-uia="previewModal--container"]': details,
    '[data-uia="videoMetadata--container"]': { textContent: "2011 • 16+" }
  });
  const metadata = extractMetadata(document, {
    hostname: "www.netflix.com",
    pathname: "/browse",
    search: "?jbv=70300472",
    href: "https://www.netflix.com/browse?jbv=70300472"
  });

  assert.equal(metadata.title, "HUNTER×HUNTER");
  assert.equal(metadata.year, 2011);
  assert.equal(metadata.workKey, "netflix:title:70300472");
});

test("does not mistake a Netflix modal navigation label for the title", () => {
  const details = {
    querySelector(selector) {
      if (selector === "strong") return { textContent: "首頁" };
      return null;
    }
  };
  const document = {
    title: "《HUNTER×HUNTER》 - Netflix",
    querySelector(selector) {
      if (selector === '[data-uia="previewModal--container"]') return details;
      return null;
    }
  };
  const metadata = extractMetadata(document, {
    hostname: "www.netflix.com",
    pathname: "/title/81785821",
    search: "",
    href: "https://www.netflix.com/title/81785821"
  });

  assert.equal(metadata.title, "HUNTER×HUNTER");
});

test("uses Netflix playback parent-series heading and deduplicates episode routes by it", () => {
  const document = documentWith({
    '[data-uia="video-title"] h4': { textContent: "Delicious in Dungeon" },
    '[data-uia="videoMetadata--container"]': { textContent: "Episode 3" }
  });
  const metadata = extractMetadata(document, {
    hostname: "www.netflix.com",
    pathname: "/watch/81766595",
    href: "https://www.netflix.com/watch/81766595"
  });

  assert.equal(metadata.title, "Delicious in Dungeon");
  assert.equal(metadata.year, null);
  assert.equal(metadata.workKey, "netflix:series:deliciousindungeon");
});

test("uses Hami Video's work JSON-LD name instead of its listing date", () => {
  const document = {
    querySelector(selector) {
      if (selector === 'meta[property="og:title"]') return { content: "偽戀S2 - 免費線上看 - 動漫 | HamiVideo" };
      return null;
    },
    querySelectorAll(selector) {
      if (selector !== 'script[type="application/ld+json"]') return [];
      return [{ textContent: JSON.stringify({ "@type": "Movie", name: "偽戀S2", datePublished: "2024-08-30" }) }];
    }
  };
  const metadata = extractMetadata(document, {
    hostname: "hamivideo.hinet.net",
    pathname: "/product/271513.do",
    href: "https://hamivideo.hinet.net/product/271513.do?cs=2"
  });

  assert.equal(metadata.title, "偽戀S2");
  assert.equal(metadata.year, null);
  assert.equal(metadata.workKey, "hamivideo:271513");
});

test("does not extract metadata from unsupported routes and parses visible years safely", () => {
  const document = documentWith({});
  assert.equal(extractMetadata(document, {
    hostname: "www.netflix.com", pathname: "/browse", search: "", href: "https://www.netflix.com/browse"
  }), null);
  assert.equal(firstYear("No date"), null);
  assert.equal(firstYear("2025 – 2026"), 2025);
});
