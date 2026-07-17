const test = require("node:test");
const assert = require("node:assert/strict");

const { parseAliases, verifyAliases } = require("../lib/local-ai.js");

test("parses and deduplicates a bounded local-AI alias response", () => {
  assert.deepEqual(
    parseAliases('{"aliases":["100 Meters", "Hyakuemu.", "100 Meters", "一百公尺。"]}', "一百公尺。"),
    ["100 Meters", "Hyakuemu."]
  );
});

test("only returns an AI-assisted result after a database-verifiable alias", async () => {
  const data = await verifyAliases(
    ["incorrect", "100 Meters"],
    { title: "一百公尺。", year: 2025 },
    async (payload) => payload.title === "100 Meters"
      ? { ok: true, data: {
        sourceTitle: "100 Meters",
        year: 2025,
        score: 0.91,
        confidence: "high",
        translations: { zhtw: "百米。", japanese: "ひゃくえむ。", english: "100 METERS" },
        ids: { anilist: 177687 },
        warnings: []
      } }
      : { ok: true, data: { score: 0.2, ids: {}, warnings: [] } }
  );

  assert.equal(data.sourceTitle, "一百公尺。");
  assert.equal(data.confidence, "medium");
  assert.equal(data.ids.anilist, 177687);
  assert.match(data.warnings.at(-1), /100 Meters/u);
});
