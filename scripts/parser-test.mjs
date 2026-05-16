import assert from "node:assert/strict";
import { parseAssistantContent, stripMarkdown } from "../src/parsers/assistantOutput.js";

const sample = [
  "**Label**: S1",
  "**Type**: speech",
  "**Source**: tadaima",
  "**Draft**: I'm home.",
  "**Notes**: casual return greeting",
  "",
  "- Label: SFX2",
  "- Type: sfx",
  "- Source: DON",
  "- Draft: BOOM",
  "- Note: big impact",
  "",
  "## Analysis",
  "Keep the SFX punchy.",
].join("\n");

const parsed = parseAssistantContent(sample);

assert.equal(parsed.blocks.length, 2);
assert.deepEqual(parsed.blocks[0], {
  label: "S1",
  type: "speech",
  source: "tadaima",
  draft: "I'm home.",
  notes: "casual return greeting",
});
assert.deepEqual(parsed.blocks[1], {
  label: "SFX2",
  type: "sfx",
  source: "DON",
  draft: "BOOM",
  notes: "big impact",
});
assert.equal(parsed.remainder, "## Analysis\nKeep the SFX punchy.");
assert.equal(stripMarkdown("- **Draft** `text`"), "Draft text");

console.log("assistant parser tests passed");
