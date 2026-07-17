const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanSourceTitle,
  confidence,
  diceSimilarity,
  rankCandidates,
  scoreCandidate,
  titleSignals,
  yearFromDate
} = require("../lib/matcher.js");

test("cleans AnimeFever episode and site suffixes", () => {
  assert.equal(
    cleanSourceTitle("果然我的青春戀愛喜劇搞錯了。完 [10] 線上看 - 巴哈姆特動畫瘋"),
    "果然我的青春戀愛喜劇搞錯了。完"
  );
  assert.equal(cleanSourceTitle("作品名稱 [中文配音] [12]"), "作品名稱");
});

test("extracts release years", () => {
  assert.equal(yearFromDate("2020-07-09"), 2020);
  assert.equal(yearFromDate("unknown"), null);
});

test("recognizes seasons and special formats across languages", () => {
  assert.deepEqual(titleSignals("某動畫 第二季"), { format: null, season: 2 });
  assert.deepEqual(titleSignals("Some Anime 3rd Season"), { format: null, season: 3 });
  assert.deepEqual(titleSignals("偽戀S2"), { format: null, season: 2 });
  assert.deepEqual(titleSignals("某動畫 劇場版"), { format: "MOVIE", season: null });
  assert.deepEqual(titleSignals("Some Anime OVA"), { format: "OVA", season: null });
});

test("prefers the correct release year for otherwise identical titles", () => {
  const ranked = rankCandidates(
    { title: "Kino no Tabi", year: 2017 },
    [
      { id: "old", titles: ["Kino no Tabi"], year: 2003 },
      { id: "new", titles: ["Kino no Tabi"], year: 2017 }
    ]
  );
  assert.equal(ranked[0].id, "new");
  assert.ok(ranked[0].score > ranked[1].score);
});

test("penalizes a movie/TV mismatch", () => {
  const movie = scoreCandidate(
    { title: "作品 劇場版", year: 2024 },
    { titles: ["作品 劇場版"], year: 2024, format: "MOVIE" }
  );
  const tv = scoreCandidate(
    { title: "作品 劇場版", year: 2024 },
    { titles: ["作品 劇場版"], year: 2024, format: "TV" }
  );
  assert.ok(movie - tv >= 0.2);
  assert.equal(confidence(movie), "high");
});

test("penalizes mismatched numbered seasons", () => {
  const right = scoreCandidate(
    { title: "作品 第三季", year: 2025 },
    { titles: ["作品 第三季"], year: 2025 }
  );
  const wrong = scoreCandidate(
    { title: "作品 第三季", year: 2025 },
    { titles: ["作品 第二季"], year: 2025 }
  );
  assert.ok(right > wrong);
  assert.ok(diceSimilarity("作品 第三季", "作品 第二季") > 0.4);
});
