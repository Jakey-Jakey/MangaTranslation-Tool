/* global React, Icon */
// Bottom scratchpad — split treatment: label list on left, selected label fills right.
// Never shows Markdown tables. Draft / final / notes as inline cards.

const ScratchpadRows = [
  { label: "N1", type: "narration", src: "最終電車は有楽町行き。", draft: "The last train to Yurakuchō.", final: "Last stop: Yurakuchō.", notes: "Kept platform-announcement register. \"Last train\" read as a signpost.", locked: true },
  { label: "S1", type: "speech",    src: "…遅かったね。",        draft: "…You're late.",                final: "…You're late.",            notes: "Soft trailing ellipsis implies relief, not reprimand.", locked: false },
  { label: "SFX1", type: "sfx",     src: "ドクン",               draft: "DOKUN",                       final: "DOKUN",                   notes: "Retain romanization — English equivalents flatten specificity.", locked: false },
  { label: "S2", type: "speech",    src: "確かめたかっただけ。", draft: "I had to make sure.",          final: "",                         notes: "", locked: false },
  { label: "SFX2", type: "sfx",     src: "ザザ…",                draft: "zaza—",                       final: "",                         notes: "", locked: false },
  { label: "S3", type: "speech",    src: "逃げて。",             draft: "Run.",                         final: "Run.",                     notes: "One-word panel. Keep short.", locked: false },
];

const Scratchpad = ({ visible, setVisible, onToggleProjectDecisions, height = 260 }) => {
  const [selected, setSelected] = React.useState("S1");
  const row = ScratchpadRows.find(r => r.label === selected) || ScratchpadRows[0];

  if (!visible) {
    return (
      <div style={{ height: 30, borderTop: "1px solid var(--line)", background: "var(--bg-1)", display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
        <button className="btn sm ghost" onClick={() => setVisible(true)}>
          <Icon name="chevron-down" size={12} style={{ transform: "rotate(180deg)" }} /> Scratchpad
        </button>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>6 blocks · 3 drafted · 2 final</span>
      </div>
    );
  }

  return (
    <div style={{ height, borderTop: "1px solid var(--line)", background: "var(--bg-1)", display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 0 }}>
      {/* label list */}
      <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "6px 10px 6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
          <div className="section-label">Scratchpad · ch02_p014</div>
          <div className="hstack" style={{ gap: 2 }}>
            <button className="btn icon sm ghost" title="Project decisions" onClick={onToggleProjectDecisions}><Icon name="book" size={12} /></button>
            <button className="btn icon sm ghost" title="Collapse" onClick={() => setVisible(false)}><Icon name="chevron-down" size={12} /></button>
          </div>
        </div>
        <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 6 }}>
          {ScratchpadRows.map((r) => {
            const isSel = selected === r.label;
            const hasFinal = !!r.final;
            return (
              <button key={r.label} onClick={() => setSelected(r.label)} style={{
                width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 5,
                display: "flex", alignItems: "center", gap: 8,
                background: isSel ? "var(--bg-3)" : "transparent",
                marginBottom: 2,
              }}>
                <span className={`pill dot ${r.type}`} style={{ fontFamily: "var(--font-mono)", minWidth: 46, justifyContent: "center" }}>{r.label}</span>
                <span className="truncate" style={{ flex: 1, fontSize: 12, color: hasFinal ? "var(--fg-1)" : "var(--fg-2)" }}>
                  {r.final || r.draft || "—"}
                </span>
                {hasFinal && <Icon name="check-circle" size={12} style={{ color: "var(--success)" }} />}
                {r.locked && <Icon name="lock" size={11} style={{ color: "var(--fg-4)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* editor */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`pill dot ${row.type}`} style={{ fontFamily: "var(--font-mono)" }}>{row.label}</span>
          <span style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "capitalize" }}>{row.type}</span>
          <span style={{ flex: 1 }} />
          <button className="btn sm ghost"><Icon name="sparkle" size={11} style={{ color: "var(--accent)" }} /> Regenerate</button>
          <button className="btn sm ghost"><Icon name="chat" size={11} /> Ask about this line</button>
          <button className="btn icon sm ghost" title="Delete"><Icon name="trash" size={12} /></button>
        </div>

        <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Source <span style={{ color: "var(--fg-4)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(JP)</span></div>
            <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 6, fontFamily: "var(--font-jp)", fontSize: 16, color: "var(--fg-1)", minHeight: 56, border: "1px solid var(--line)" }}>
              {row.src}
            </div>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Draft <span style={{ color: "var(--fg-4)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· from model</span></div>
            <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 6, fontSize: 13, color: "var(--fg-1)", minHeight: 56, border: "1px dashed var(--line-strong)" }}>
              {row.draft}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="hstack" style={{ marginBottom: 6, justifyContent: "space-between" }}>
              <div className="section-label">Final · your translation</div>
              <button className="btn sm ghost" style={{ fontSize: 11 }}><Icon name="copy" size={11} /> Copy draft to final</button>
            </div>
            <div style={{ padding: 12, background: "var(--bg-1)", borderRadius: 6, fontSize: 14, color: "var(--fg-1)", minHeight: 52, border: `1.5px solid ${row.final ? "var(--success)" : "var(--accent)"}`, boxShadow: `inset 0 0 0 3px color-mix(in oklab, ${row.final ? "var(--success)" : "var(--accent)"} 8%, transparent)` }}>
              {row.final || <span style={{ color: "var(--fg-4)" }}>Write your final translation…</span>}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="section-label" style={{ marginBottom: 6 }}>Notes</div>
            <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 6, fontSize: 12, color: "var(--fg-2)", minHeight: 40, border: "1px solid var(--line)", lineHeight: 1.5 }}>
              {row.notes || <span style={{ color: "var(--fg-4)" }}>Localization notes, references, alt phrasings…</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Scratchpad });
