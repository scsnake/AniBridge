const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../lib/platforms.js"), "utf8"),
  sandbox
);

const {
  defaultStreamingVisibility,
  defaultVisibility,
  mergedStreamingVisibility,
  mergedVisibility,
  platforms,
  streamingPlatforms
} = sandbox.AniBridgePlatforms;

test("ships the four existing integrations enabled by default", () => {
  const defaults = defaultVisibility();
  assert.equal(defaults.mal, true);
  assert.equal(defaults.anilist, true);
  assert.equal(defaults.bangumi, true);
  assert.equal(defaults.kitsu, true);
});

test("keeps suggested Japanese ratings platforms opt-in", () => {
  const defaults = defaultVisibility();
  assert.equal(defaults.filmarks, false);
  assert.equal(defaults.anikore, false);
  assert.equal(defaults.imdb, false);
  assert.equal(platforms.filter((item) => item.category === "ratings").length, 3);
});

test("provides a secure homepage for every settings shortcut", () => {
  for (const platform of platforms) {
    assert.match(platform.homepage, /^https:\/\//u);
  }
});

test("merges saved preferences over future-safe defaults", () => {
  const merged = mergedVisibility({ mal: false, annict: true });
  assert.equal(merged.mal, false);
  assert.equal(merged.annict, true);
  assert.equal(merged.anilist, true);
});

test("defaults database-page streaming searches to Bahamut Anime and Netflix", () => {
  const defaults = defaultStreamingVisibility();
  assert.equal(defaults.animegamer, true);
  assert.equal(defaults.netflix, true);
  assert.equal(defaults.hamivideo, false);
  assert.equal(streamingPlatforms.length, 3);
  assert.equal(mergedStreamingVisibility({ netflix: false }).netflix, false);
  assert.equal(mergedStreamingVisibility({ netflix: false }).animegamer, true);
});
