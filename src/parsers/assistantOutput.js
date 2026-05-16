export function parseAssistantContent(content = "") {
  const lines = String(content).split(/\r?\n/);
  const blocks = [];
  let current = null;
  let activeField = "";
  let remainderStart = lines.length;
  const commit = () => {
    if (current && (current.source || current.draft || current.notes || current.type)) blocks.push(current);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    const match = line.match(/^(?:[-*]\s*)?(?:\*\*)?Label(?:\*\*)?\s*:\s*(SFX\d+|S\d+|N\d+)/i);
    if (match) {
      commit();
      current = { label: match[1].toUpperCase(), type: "", source: "", draft: "", notes: "" };
      activeField = "";
      continue;
    }
    if (!current) continue;
    const field = line.match(/^(?:[-*]\s*)?(?:\*\*)?(Type|Source|Draft|Notes?)(?:\*\*)?\s*:\s*(.*)$/i);
    if (!field) {
      if (!line) continue;
      if (activeField && /^\s+/.test(rawLine)) {
        current[activeField] = `${current[activeField]} ${stripMarkdown(line)}`.trim();
        continue;
      }
      remainderStart = index;
      break;
    }
    const key = field[1].toLowerCase().replace(/^note$/, "notes");
    current[key] = stripMarkdown(field[2]);
    activeField = key;
  }
  commit();
  return {
    blocks,
    remainder: lines.slice(remainderStart).join("\n").trim(),
  };
}

export function parseAssistantBlocks(content = "") {
  return parseAssistantContent(content).blocks;
}

export function stripMarkdown(value = "") {
  return String(value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*]\s+/, "")
    .trim();
}
