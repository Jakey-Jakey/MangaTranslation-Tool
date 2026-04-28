/* global React, Icon */
const { useState } = React;

// Right-side chat panel. Shows an assistant response with structured label chips.
const ChatPanel = ({ crops, queue, setQueue, onPromoteToScratchpad, compact = false }) => {
  const [input, setInput] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-1)", borderLeft: "1px solid var(--line)", minWidth: 0 }}>
      {/* header */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="hstack" style={{ gap: 8 }}>
          <Icon name="chat" size={14} style={{ color: "var(--fg-3)" }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>Translation chat</div>
          <span className="pill" style={{ fontSize: 10 }}>auto-saved</span>
        </div>
        <div className="hstack" style={{ gap: 2 }}>
          <button className="btn icon sm ghost" title="Shortcuts"><Icon name="keyboard" size={13} /></button>
          <button className="btn icon sm ghost" title="More"><Icon name="dots" size={13} /></button>
        </div>
      </div>

      {/* language + model strip */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", display: "flex", gap: 6, flexWrap: "wrap", background: "var(--bg-1)" }}>
        <div className="hstack" style={{ gap: 4, fontSize: 11, color: "var(--fg-3)" }}>
          <Icon name="globe" size={12} />
          <select className="inp" style={{ height: 24, padding: "0 6px", fontSize: 11, width: "auto" }}>
            <option>Japanese (auto)</option><option>Korean</option><option>Chinese</option>
          </select>
          <Icon name="chevron-right" size={11} />
          <select className="inp" style={{ height: 24, padding: "0 6px", fontSize: 11, width: "auto" }}>
            <option>English (US)</option><option>English (UK)</option><option>Spanish</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" style={{ fontSize: 11 }}>
          <Icon name="sparkle" size={11} style={{ color: "var(--accent)" }} />
          Gemini 3.1 Pro
          <Icon name="chevron-down" size={11} style={{ color: "var(--fg-3)" }} />
        </button>
      </div>

      {/* thread */}
      <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* user message */}
        <div style={{ alignSelf: "flex-end", maxWidth: "92%" }}>
          <div style={{ padding: "9px 12px", borderRadius: "12px 12px 2px 12px", background: "var(--accent-soft)", color: "var(--fg-1)", fontSize: 13, lineHeight: 1.45 }}>
            Full page — focus on the argument between the two characters in panels 2–4.
          </div>
          <div className="hstack" style={{ justifyContent: "flex-end", marginTop: 4, gap: 6 }}>
            <span className="pill" style={{ fontSize: 10 }}><Icon name="image" size={10} /> ch02_p014.png</span>
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>2:41 pm</span>
          </div>
        </div>

        {/* assistant */}
        <div>
          <div className="hstack" style={{ gap: 8, marginBottom: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg, var(--accent), #8A4BFF)", display: "grid", placeItems: "center", color: "#fff" }}><Icon name="sparkle" size={11} /></span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Gemini 3.1 Pro</span>
            <span className="pill" style={{ fontSize: 10 }}>vision</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>8.3k tok · $0.014</span>
          </div>

          {/* structured chips */}
          <div style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)", marginBottom: 10 }}>
            <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <div className="section-label">First pass · reading order</div>
              <button className="btn sm" onClick={onPromoteToScratchpad}>
                <Icon name="download" size={11} /> Send to scratchpad
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {[
                { l: "N1", t: "narration" }, { l: "S1", t: "speech" }, { l: "SFX1", t: "sfx" },
                { l: "S2", t: "speech" }, { l: "S3", t: "speech" }, { l: "SFX2", t: "sfx" },
                { l: "S4", t: "speech" },
              ].map((x, i) => (
                <button key={i} className={`pill dot ${x.t}`} style={{ cursor: "pointer", fontFamily: "var(--font-mono)" }}>{x.l}</button>
              ))}
            </div>
          </div>

          {/* per-line analysis */}
          {[
            { label: "S1", type: "speech", src: "…遅かったね。", draft: "…You're late.", note: "Soft trailing ellipsis implies relief more than reprimand. Consider \"…Took you long enough.\" only if the character is meant to read as gruff." },
            { label: "SFX1", type: "sfx", src: "ドクン", draft: "DOKUN", note: "Standard heartbeat onomatopoeia. Typesetting convention: romanize and retain; English equivalents (\"THUMP\", \"BA-DUMP\") flatten the specificity." },
          ].map((b, i) => (
            <div key={i} style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-1)", marginBottom: 8 }}>
              <div className="hstack" style={{ gap: 8, marginBottom: 6 }}>
                <span className={`pill dot ${b.type}`} style={{ fontFamily: "var(--font-mono)" }}>{b.label}</span>
                <span className="muted" style={{ fontSize: 11, fontFamily: "var(--font-jp)" }}>{b.src}</span>
                <span style={{ flex: 1 }} />
                <button className="btn icon sm ghost" title="Copy draft"><Icon name="copy" size={11} /></button>
                <button className="btn icon sm ghost" title="Promote to final"><Icon name="check" size={11} /></button>
              </div>
              <div style={{ fontSize: 13, marginBottom: 4, color: "var(--fg-1)" }}>{b.draft}</div>
              <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>{b.note}</div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "0 2px" }}>+ 5 more blocks · analysis continues below</div>
        </div>
      </div>

      {/* queue */}
      {queue.length > 0 && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
          <div className="hstack" style={{ marginBottom: 6 }}>
            <div className="section-label">Send queue · {queue.length}</div>
            <span style={{ flex: 1 }} />
            <button className="btn sm ghost" style={{ fontSize: 11 }} onClick={() => setQueue([])}>Clear</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {queue.map((q, i) => (
              <div key={q.id} draggable className="pill dot" style={{
                color: `var(--crop-${q.type})`, background: `color-mix(in oklab, var(--crop-${q.type}) 10%, transparent)`,
                border: `1px solid color-mix(in oklab, var(--crop-${q.type}) 22%, transparent)`,
                fontFamily: "var(--font-mono)", cursor: "grab", paddingRight: 4
              }}>
                <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-sans)", marginRight: 2 }}>{i + 1}</span>
                {q.label}
                <Icon name="close" size={9} style={{ marginLeft: 4, color: "var(--fg-3)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* composer */}
      <div style={{ padding: 10, borderTop: "1px solid var(--line)", background: "var(--bg-1)" }}>
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 8 }}>
          <textarea
            className="mt-scroll"
            placeholder="Ask a follow-up, or attach the current page / selected crops…"
            value={input} onChange={(e) => setInput(e.target.value)}
            style={{ width: "100%", minHeight: 44, border: 0, background: "transparent", resize: "none", outline: "none", color: "var(--fg-1)", fontSize: 13, fontFamily: "var(--font-sans)" }}
          />
          <div className="hstack" style={{ marginTop: 4, gap: 4 }}>
            <button className="btn sm ghost" title="Attach current page"><Icon name="image" size={12} /> Page</button>
            <button className="btn sm ghost" title="Attach selection"><Icon name="crop" size={12} /> Selection</button>
            <button className="btn sm ghost" title="Queue"><Icon name="queue" size={12} /> Queue {queue.length > 0 && `(${queue.length})`}</button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>visually lossless · PNG</span>
            <button className="btn primary sm"><Icon name="send" size={12} /> Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ChatPanel });
