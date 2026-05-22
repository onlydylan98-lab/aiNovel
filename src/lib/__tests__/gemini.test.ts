import { strict as assert } from "node:assert";
import test from "node:test";
import { normalizeNovelOutline } from "../novel-generation";

test("normalizeNovelOutline accepts characterProfiles returned as structured objects", () => {
  const outline = normalizeNovelOutline({
    synopsis: "第一段摘要",
    worldview: "第一段世界观",
    characterProfiles: [
      {
        name: "林渊",
        role: "主角",
        profile: "黑砂聚落孤儿，杀伐果决。",
      },
      {
        name: "苏晚",
        role: "女主之一",
        profile: "擅长医道与药理。",
      },
    ],
    chapters: [
      {
        chapterNumber: 1,
        title: "黑砂废土，命如草芥",
        synopsis: "林渊在废土中挣扎求生。",
      },
    ],
  });

  assert.equal(outline.synopsis, "第一段摘要");
  assert.equal(outline.worldview, "第一段世界观");
  assert.match(outline.characterProfiles, /林渊/);
  assert.match(outline.characterProfiles, /苏晚/);
  assert.equal(outline.chapters.length, 1);
  assert.equal(outline.chapters[0].status, "pending");
});
