/* global React, Icon */
const { useState } = React;

// Workbench: unified crop queue + scratchpad panel with Text / Card view toggle.
// Takes the place of both the old Scratchpad (bottom) and CropQueue (right).
// Lives on the right side below the chat when compact=false, or full right column.

const WB_ROWS = [
  { label: "N1", type: "narration", src: "最終電車は有楽町行き。",       draft: "The last train to Yurakuchō.", final: "Last stop: Yurakuchō.", notes: "Kept platform-announcement register.", queued: false, order: null },
  { label: "S1", type: "speech",    src: "…遅かったね。",                draft: "…You're late.",                 final: "…You're late.",         notes: "Soft trailing ellipsis implies relief, not reprimand.", queued: true, order: 1 },
  { label: "SFX1", type: "sfx",     src: "ドクン",                       draft: "DOKUN",                         final: "DOKUN",                 notes: "Retain romanization — English equivalents flatten specificity.", queued: true, order: 2 },
  { label: "S2", type: "speech",    src: "確かめたかっただけ。",         draft: "I had to make sure.",           final: "",                      notes: "", queued: true, order: 3 },
  { label: "SFX2", type: "sfx",     src: "ザザ…",                        draft: "zaza—",                         final: "",                      notes: "", queued: false, order: null },
  { label: "S3", type: "speech",    src: "逃げて。",                     draft: "Run.",                          final: "Run.",                  notes: "One-word panel. Keep short.", queued: false, order: null },
];

const typeColor = (t) => ({ speech: "var(--speech)", sfx: "var(--sfx)", narration: "var(--narration)" }[t]);

const Workbench = ({ onOpenDecisions }) => {
  const [view, setView] = useState("text"); // "text" | "card"
  const [rows, setRows] = useState(WB_ROWS);
  const [selected, setSelected] = useState("S1");
  const [filter, setFilter] = useState("all"); // all | queue | final | draft

  const toggleQueue = (label) => setRows(rs => {
    const r = rs.find(x => x.label === label);
    if (!r) return rs;
    if (r.queued) return rs.map(x => x.label === label ? { ...x, queued: false, order: null } : x);
    const maxOrder = Math.max(0, ...rs.filter(x => x.queued).map(x => x.order || 0));
    return rs.map(x => x.label === label ? { ...x, queued: true, order: maxOrder + 1 } : x);
  });
  const moveQueue = (label, dir) => setRows(rs => {
    const q = rs.filter(r => r.queued).sort((a, b) => a.order - b.order);
    const i = q.findIndex(r => r.label === label);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= q.length) return rs;
    const a = q[i], b = q[j];
    return rs.map(r => r.label === a.label ? { ...r, order: b.order } : r.label === b.label ? { ...r, order: a.order } : r);
  });

  const visibleRows = rows.filter(r => {
    if (filter === "queue") return r.queued;
    if (filter === "final") return !!r.final;
    if (filter === "draft") return !!r.draft && !r.final;
    return true;
  });

  const queueCount = rows.filter(r => r.queued).length;
  const finalCount = rows.filter(r => r.final).length;

  const sel = rows.find(r => r.label === selected) || rows[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-1)", borderLeft: "1px solid var(--line)", minHeight: 0, minWidth: 0 }}>
      {/* header */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="layers" size={14} style={{ color: "var(--fg-3)" }} />
        <div style={{ fontSize: 13, fontWeight: 500 }}>Workbench</div>
        <span className="pill" style={{ fontSize: 10, padding: "1px 6px" }}>ch02_p014</span>
        <span style={{ flex: 1 }} />
        {/* view switcher */}
        <div className="hstack" style={{ background: "var(--bg-2)", padding: 2, borderRadius: 6, border: "1px solid var(--line)", gap: 0 }}>
          <button className="btn icon sm ghost" aria-pressed={view === "text"} onClick={() => setView("text")} title="Text view"><Icon name="queue" size={12} /></button>
          <button className="btn icon sm ghost" aria-pressed={view === "card"} onClick={() => setView("card")} title="Card view"><Icon name="grid" size={12} /></button>
        </div>
        <button className="btn icon sm ghost" title="Project decisions" onClick={onOpenDecisions}><Icon name="book" size={12} /></button>
      </div>

      {/* stats strip */}
      <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", background: "var(--bg-1)", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { id: "all",   l: "All",    c: rows.length },
          { id: "queue", l: "Queue",  c: queueCount,  color: "var(--accent)" },
          { id: "draft", l: "Drafts", c: rows.filter(r => r.draft && !r.final).length },
          { id: "final", l: "Final",  c: finalCount, color: "var(--success)" },
        ].map(f => (
          <button key={f.id} className="btn sm ghost" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} style={{ fontSize: 11, padding: "0 8px", height: 22 }}>
            {f.l} <span style={{ color: f.color || "var(--fg-3)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>{f.c}</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {queueCount > 0 && (
          <button className="btn primary sm" style={{ height: 22, fontSize: 11 }}>
            <Icon name="send" size={11} /> Send queue ({queueCount})
          </button>
        )}
      </div>

      {/* body */}
      {view === "text" ? (
        <TextView rows={visibleRows} selected={selected} setSelected={setSelected} sel={sel} toggleQueue={toggleQueue} moveQueue={moveQueue} />
      ) : (
        <CardView rows={visibleRows} selected={selected} setSelected={setSelected} toggleQueue={toggleQueue} />
      )}
    </div>
  );
};

// ----- TEXT VIEW: list on top, editor below (vertical split suits right-column layout) -----

const TextView = ({ rows, selected, setSelected, sel, toggleQueue, moveQueue }) => {
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateRows: "minmax(120px, 30%) 1fr", minHeight: 0 }}>
      {/* row list */}
      <div className="mt-scroll scroll-y" style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-1)" }}>
        {rows.map((r) => {
          const isSel = selected === r.label;
          return (
            <div key={r.label} onClick={() => setSelected(r.label)} style={{
              display: "grid", gridTemplateColumns: "auto 56px 1fr auto auto", gap: 8, alignItems: "center",
              padding: "5px 10px", cursor: "pointer",
              background: isSel ? "var(--bg-3)" : "transparent",
              borderLeft: `2px solid ${isSel ? typeColor(r.type) : "transparent"}`,
            }}>
              {/* queue toggle + order */}
              <button onClick={(e) => { e.stopPropagation(); toggleQueue(r.label); }}
                title={r.queued ? "Remove from queue" : "Add to queue"}
                style={{
                  width: 22, height: 22, borderRadius: 4, border: 0, cursor: "pointer",
                  background: r.queued ? "var(--accent)" : "var(--bg-2)",
                  color: r.queued ? "#fff" : "var(--fg-3)",
                  display: "grid", placeItems: "center",
                  fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                }}>
                {r.queued ? r.order : "+"}
              </button>
              <span className={`pill dot ${r.type}`} style={{ fontFamily: "var(--font-mono)", justifyContent: "center" }}>{r.label}</span>
              <span className="truncate" style={{ fontSize: 12, color: r.final ? "var(--fg-1)" : "var(--fg-2)" }}>
                {r.final || r.draft || <span style={{ color: "var(--fg-4)" }}>no translation yet</span>}
              </span>
              <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-jp)", opacity: 0.8 }}>{r.src.slice(0, 8)}</span>
              {r.final
                ? <Icon name="check-circle" size={12} style={{ color: "var(--success)" }} />
                : r.draft ? <Icon name="pencil" size={11} style={{ color: "var(--fg-3)" }} />
                : <span style={{ width: 12 }} />}
            </div>
          );
        })}
      </div>

      {/* editor */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--bg-1)" }}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`pill dot ${sel.type}`} style={{ fontFamily: "var(--font-mono)" }}>{sel.label}</span>
          {sel.queued && <span className="pill" style={{ fontSize: 10, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid transparent" }}>#{sel.order} in queue</span>}
          <span style={{ flex: 1 }} />
          <button className="btn sm ghost" title="Regenerate"><Icon name="sparkle" size={11} style={{ color: "var(--accent)" }} /></button>
          <button className="btn sm ghost" title="Ask"><Icon name="chat" size={11} /></button>
          <button className="btn icon sm ghost" title="Delete"><Icon name="trash" size={12} /></button>
        </div>
        <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 10, display: "grid", gap: 8 }}>
          <WBField label={`Source · JP`} jp>{sel.src}</WBField>
          <WBField label="Draft · from model" dashed>{sel.draft || <span style={{ color: "var(--fg-4)" }}>—</span>}</WBField>
          <WBField label="Final · your translation" strong={!!sel.final} accent={!sel.final}>{sel.final || <span style={{ color: "var(--fg-4)" }}>Write your final translation…</span>}</WBField>
          <WBField label="Notes">{sel.notes || <span style={{ color: "var(--fg-4)" }}>Localization notes, references, alt phrasings…</span>}</WBField>
        </div>
      </div>
    </div>
  );
};

const WBField = ({ label, children, jp, dashed, accent, strong }) => (
  <div>
    <div className="section-label" style={{ marginBottom: 4, fontSize: 10 }}>{label}</div>
    <div style={{
      padding: "8px 10px",
      background: strong ? "var(--bg-1)" : "var(--bg-2)",
      borderRadius: 6,
      fontSize: jp ? 15 : 13,
      fontFamily: jp ? "var(--font-jp)" : "var(--font-sans)",
      color: "var(--fg-1)",
      minHeight: 32,
      border: dashed ? "1px dashed var(--line-strong)"
            : accent ? "1.5px solid var(--accent)"
            : strong ? "1.5px solid var(--success)"
            : "1px solid var(--line)",
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  </div>
);

// ----- CARD VIEW: big rich cards stacked vertically -----

const CardView = ({ rows, selected, setSelected, toggleQueue }) => {
  return (
    <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 10, display: "grid", gap: 10 }}>
      {rows.map((r) => {
        const isSel = selected === r.label;
        return (
          <div key={r.label} onClick={() => setSelected(r.label)} style={{
            padding: 12, borderRadius: 8,
            background: isSel ? "var(--bg-2)" : "var(--bg-1)",
            border: `1px solid ${isSel ? "color-mix(in oklab, " + typeColor(r.type) + " 40%, transparent)" : "var(--line)"}`,
            borderLeft: `3px solid ${typeColor(r.type)}`,
            cursor: "pointer",
            display: "grid", gap: 6,
          }}>
            <div className="hstack" style={{ gap: 8 }}>
              <span className={`pill dot ${r.type}`} style={{ fontFamily: "var(--font-mono)" }}>{r.label}</span>
              <span style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "capitalize" }}>{r.type}</span>
              <span style={{ flex: 1 }} />
              <button onClick={(e) => { e.stopPropagation(); toggleQueue(r.label); }}
                className={`btn sm ${r.queued ? "" : "ghost"}`}
                style={r.queued ? { background: "var(--accent)", color: "#fff", border: "1px solid transparent" } : {}}>
                {r.queued ? <><Icon name="check" size={11} /> Queued #{r.order}</> : <><Icon name="plus" size={11} /> Queue</>}
              </button>
            </div>
            <div style={{ fontSize: 15, fontFamily: "var(--font-jp)", color: "var(--fg-1)" }}>{r.src}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div className="section-label" style={{ fontSize: 9, marginBottom: 3 }}>Draft</div>
                <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 4, fontSize: 12, border: "1px dashed var(--line-strong)", minHeight: 28 }}>
                  {r.draft || <span style={{ color: "var(--fg-4)" }}>—</span>}
                </div>
              </div>
              <div>
                <div className="section-label" style={{ fontSize: 9, marginBottom: 3 }}>Final</div>
                <div style={{ padding: "6px 8px", background: "var(--bg-1)", borderRadius: 4, fontSize: 12, border: `1.5px solid ${r.final ? "var(--success)" : "var(--line-strong)"}`, minHeight: 28 }}>
                  {r.final || <span style={{ color: "var(--fg-4)" }}>write…</span>}
                </div>
              </div>
            </div>
            {r.notes && <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, paddingTop: 2 }}>{r.notes}</div>}
          </div>
        );
      })}
    </div>
  );
};

Object.assign(window, { Workbench });
