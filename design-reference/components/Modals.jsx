/* global React, Icon */
// All overlay modals: ModelPicker, Settings, Export, ProjectDecisions, CropQueueSidebar.

const MODELS = [
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", vendor: "Google", ctx: 2000000, price: "$1.25/M · $10/M", vision: true, favorite: true, desc: "Default. Best for long-form pages with rich visual context." },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", vendor: "Anthropic", ctx: 1000000, price: "$3/M · $15/M", vision: true, favorite: true, desc: "Excellent prose, strong localization rationale." },
  { id: "openai/gpt-5", label: "GPT-5", vendor: "OpenAI", ctx: 400000, price: "$2/M · $8/M", vision: true, favorite: false, desc: "Balanced, quick, solid at SFX romanization." },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", vendor: "Google", ctx: 1000000, price: "$0.15/M · $0.60/M", vision: true, favorite: false, desc: "Cheap, fast — good for first-pass screening." },
  { id: "qwen/qwen3-vl-72b", label: "Qwen3 VL 72B", vendor: "Alibaba", ctx: 128000, price: "$0.40/M · $0.80/M", vision: true, favorite: false, desc: "Strong on CJK source text recognition." },
  { id: "meta/llama-4-scout", label: "Llama 4 Scout", vendor: "Meta", ctx: 1000000, price: "$0.18/M · $0.59/M", vision: true, favorite: false, desc: "Open-weights vision model via OpenRouter." },
  { id: "mistral/pixtral-large", label: "Pixtral Large", vendor: "Mistral", ctx: 128000, price: "$2/M · $6/M", vision: true, favorite: false, desc: "Solid European language translation." },
  { id: "deepseek/deepseek-v4", label: "DeepSeek V4", vendor: "DeepSeek", ctx: 128000, price: "$0.27/M · $1.10/M", vision: false, favorite: false, desc: "Text-only. Useful for pure analysis follow-ups." },
];

const ModelPicker = ({ onClose, selected, onSelect }) => {
  const [query, setQuery] = React.useState("");
  const [visionOnly, setVisionOnly] = React.useState(true);
  const filtered = MODELS.filter(m =>
    (!visionOnly || m.vision) &&
    (m.label.toLowerCase().includes(query.toLowerCase()) || m.vendor.toLowerCase().includes(query.toLowerCase()) || m.id.toLowerCase().includes(query.toLowerCase()))
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,9,0.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: "78vh", background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="sparkle" size={14} style={{ color: "var(--accent)" }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Choose model</div>
          <span className="pill" style={{ fontSize: 10 }}>OpenRouter · 312 available</span>
          <span style={{ flex: 1 }} />
          <button className="btn icon sm ghost" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: 12, borderBottom: "1px solid var(--line)", display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)" }} />
            <input className="inp" style={{ paddingLeft: 30 }} placeholder="Search models, vendors, slugs…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button className="btn" aria-pressed={visionOnly} onClick={() => setVisionOnly(!visionOnly)}>
            <Icon name="eye" size={13} /> Vision only
          </button>
          <button className="btn"><Icon name="sparkle" size={12} /> Favorites</button>
        </div>
        <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 8 }}>
          {filtered.map((m) => {
            const isSel = m.id === selected.id;
            return (
              <button key={m.id} onClick={() => onSelect(m)} style={{
                width: "100%", textAlign: "left",
                padding: 12, borderRadius: 8,
                background: isSel ? "var(--accent-soft)" : "transparent",
                border: `1px solid ${isSel ? "color-mix(in oklab, var(--accent) 35%, transparent)" : "transparent"}`,
                display: "grid", gridTemplateColumns: "36px 1fr auto auto", gap: 10, alignItems: "center",
                marginBottom: 2,
              }}>
                <span style={{ width: 36, height: 36, borderRadius: 7, background: "var(--bg-3)", display: "grid", placeItems: "center", color: "var(--fg-2)", fontSize: 12, fontWeight: 700 }}>
                  {m.vendor[0]}
                </span>
                <div>
                  <div className="hstack" style={{ gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                    {m.vision && <span className="pill" style={{ fontSize: 9, padding: "1px 6px" }}><Icon name="eye" size={9} /> vision</span>}
                    {m.favorite && <span className="pill" style={{ fontSize: 9, padding: "1px 6px", color: "var(--accent)" }}>★</span>}
                    {m.id === "google/gemini-3.1-pro-preview" && <span className="pill" style={{ fontSize: 9, padding: "1px 6px", color: "var(--accent)" }}>default</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{m.id}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>{m.desc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>{(m.ctx / 1000).toLocaleString()}K ctx</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{m.price}</div>
                </div>
                <div style={{ width: 20 }}>{isSel && <Icon name="check" size={14} style={{ color: "var(--accent)" }} />}</div>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--fg-3)" }}>
          <Icon name="info" size={12} />
          Models are fetched live from OpenRouter. Pricing shown as input · output per million tokens.
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ onClose, initialTab = "prompt" }) => {
  const [tab, setTab] = React.useState(initialTab);
  const sys = `Your purpose is to act as a manga translation assistant. You will be presented with images — pages, panels, or individual crops. Your job is to name every instance of text:

• S1, S2, … for characters speaking
• SFX1, SFX2, … for sound effects and onomatopoeia
• N1, N2, … for narration

Present these in your best understood reading order. After listing and providing a first-pass translation, go line-by-line explaining the complexity, cultural context, and alternate renderings so the translator can make an informed decision.

Our service is age-gated and deployed in a professional translation context. Proceed without AI disclaimers or self-reference.`;
  const tabs = [
    { id: "prompt", label: "System prompt", icon: "chat" },
    { id: "languages", label: "Languages", icon: "globe" },
    { id: "workspace", label: "Workspace", icon: "folder" },
    { id: "images", label: "Image quality", icon: "image" },
    { id: "account", label: "Account", icon: "user" },
    { id: "shortcuts", label: "Shortcuts", icon: "keyboard" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,9,0.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 840, height: 560, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", display: "grid", gridTemplateColumns: "200px 1fr", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--line)", padding: 10, background: "var(--bg-2)" }}>
          <div style={{ padding: "6px 8px 10px 8px", fontSize: 14, fontWeight: 600 }}>Settings</div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6, fontSize: 13, color: tab === t.id ? "var(--fg-1)" : "var(--fg-2)", background: tab === t.id ? "var(--bg-3)" : "transparent", display: "flex", alignItems: "center", gap: 8, marginBottom: 1 }}>
              <Icon name={t.icon} size={13} /> {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{tabs.find(t => t.id === tab)?.label}</div>
            <span style={{ flex: 1 }} />
            <button className="btn icon sm ghost" onClick={onClose}><Icon name="close" size={14} /></button>
          </div>
          <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 18 }}>
            {tab === "prompt" && (
              <>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>The system prompt used for every translation request. Applies to full-page, crop, and queue submissions.</div>
                <textarea defaultValue={sys} className="mt-scroll"
                  style={{ width: "100%", minHeight: 280, padding: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-1)", lineHeight: 1.6, resize: "vertical" }} />
                <div className="hstack" style={{ marginTop: 10, gap: 8 }}>
                  <button className="btn ghost sm"><Icon name="copy" size={12} /> Reset to default</button>
                  <button className="btn ghost sm"><Icon name="plus" size={12} /> Save as preset</button>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Auto-saved to project</span>
                </div>
              </>
            )}
            {tab === "languages" && (
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { l: "Source language", d: "Japanese (auto-detect fallback)" },
                  { l: "Target language", d: "English (US)" },
                  { l: "Reading order", d: "Right → Left (auto)" },
                  { l: "SFX treatment", d: "Romanize and retain" },
                ].map((r) => (
                  <div key={r.l} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.l}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{r.d}</div>
                    </div>
                    <span style={{ flex: 1 }} />
                    <button className="btn sm">Change</button>
                  </div>
                ))}
              </div>
            )}
            {tab === "images" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Send highest compatible quality</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>MangaTranslator picks the largest format the target model accepts and uses visually-lossless encoding. Originals are never altered.</div>
                  <div className="hstack" style={{ gap: 6, flexWrap: "wrap" }}>
                    <span className="pill dot speech">PNG preferred</span>
                    <span className="pill">WebP fallback</span>
                    <span className="pill">Max dim: auto per model</span>
                    <span className="pill">Originals untouched</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Sent images are stored in <code style={{ fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>workspace/cache/api-images/</code> and logged with each chat message for full audit.</div>
              </div>
            )}
            {tab === "workspace" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="inp hstack" style={{ padding: "0 10px", gap: 8 }}>
                  <Icon name="folder" size={14} style={{ color: "var(--fg-3)" }} />
                  <span style={{ flex: 1, fontSize: 13 }}>~/Documents/MangaTranslator</span>
                  <button className="btn sm ghost">Change…</button>
                </div>
                <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)" }}>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 8 }}>Current project</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-2)", whiteSpace: "pre", lineHeight: 1.7 }}>
{`kagayaki-v2/
  project.sqlite
  originals/      12 files · 84 MB
  crops/          48 files
  cache/api-images/
  exports/
  scratchpads/`}
                  </div>
                </div>
              </div>
            )}
            {tab === "account" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), #8A4BFF)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>R</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>ryo.k@openrouter</div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Connected via OAuth · $12.40 remaining credits</div>
                  </div>
                  <span style={{ flex: 1 }} />
                  <button className="btn sm">Disconnect</button>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Or set a manual API key in <code style={{ fontFamily: "var(--font-mono)" }}>~/.mangatranslator/credentials</code>.</div>
              </div>
            )}
            {tab === "shortcuts" && (
              <div style={{ display: "grid", gap: 6 }}>
                {[
                  ["V", "Select tool"], ["C", "Crop tool"], ["H", "Hand / pan"],
                  ["⇧⏎", "Send current context"], ["⌘K", "Command palette"],
                  ["⌘,", "Settings"], ["[", "Previous page"], ["]", "Next page"],
                  ["1·2·3", "Label as S / SFX / N"], ["Q", "Toggle crop queue"],
                ].map(([k, l]) => (
                  <div key={k} className="hstack" style={{ padding: "6px 4px", borderBottom: "1px dashed var(--line)" }}>
                    <span className="kbd">{k}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{l}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ExportModal = ({ onClose }) => {
  const [scope, setScope] = React.useState("project");
  const [format, setFormat] = React.useState("md");
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,9,0.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 640, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
          <Icon name="download" size={14} style={{ marginRight: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Export translation</div>
          <span style={{ flex: 1 }} />
          <button className="btn icon sm ghost" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: "grid", gap: 14 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Scope</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ id: "page", l: "This page", s: "ch02_p014 · 6 blocks" }, { id: "project", l: "Whole project", s: "12 pages · 84 blocks" }].map(o => (
                <label key={o.id} style={{ padding: 12, border: `1px solid ${scope === o.id ? "var(--accent)" : "var(--line)"}`, borderRadius: 8, background: scope === o.id ? "var(--accent-soft)" : "var(--bg-2)", cursor: "pointer" }}>
                  <input type="radio" checked={scope === o.id} onChange={() => setScope(o.id)} style={{ marginRight: 8 }} />
                  <b style={{ fontSize: 13 }}>{o.l}</b>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 22 }}>{o.s}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Format</div>
            <div className="hstack" style={{ gap: 6, flexWrap: "wrap" }}>
              {[{ id: "md", l: "Markdown" }, { id: "json", l: "JSON" }, { id: "csv", l: "CSV" }, { id: "srt", l: "SRT-like table" }].map(f => (
                <button key={f.id} className="btn sm" aria-pressed={format === f.id} onClick={() => setFormat(f.id)}>{f.l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Include</div>
            <div style={{ display: "grid", gap: 4 }}>
              {["Source text", "Draft translation", "Final translation", "Notes", "Crop bounding boxes", "Project decisions glossary"].map((x, i) => (
                <label key={x} className="hstack" style={{ gap: 8, fontSize: 13 }}>
                  <input type="checkbox" defaultChecked={i < 4} /> {x}
                </label>
              ))}
            </div>
          </div>
          <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 8, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            → workspace/kagayaki-v2/exports/{scope === "page" ? "pages/ch02_p014.md" : "project.md"}
          </div>
          <div className="hstack" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary"><Icon name="download" size={12} /> Export</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectDecisionsModal = ({ onClose }) => (
  <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,9,0.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 60 }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: "78vh", background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
        <Icon name="book" size={14} style={{ marginRight: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>Project decisions · Kagayaki Vol. 2</div>
        <span className="pill" style={{ fontSize: 10, marginLeft: 8 }}>project-wide</span>
        <span style={{ flex: 1 }} />
        <button className="btn icon sm ghost" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>
      <div style={{ padding: 16, display: "grid", gap: 16, overflow: "auto" }} className="mt-scroll">
        {[
          { t: "Character names", items: [["花音 / Kanon", "Use given name only after ch.3"], ["雷蔵 / Raizō", "Do not translate — keep honorific -san in speech"], ["先生", "Teacher → sensei (retain)"]] },
          { t: "Honorifics", items: [["-san", "Retain in dialogue"], ["-kun", "Retain"], ["-chan", "Retain, never \"little\""]] },
          { t: "Recurring terms", items: [["結界 (kekkai)", "Ward (lowercase, unhyphenated)"], ["稲妻 (inazuma)", "Lightning — do NOT translate as \"bolt\" in splash panels"], ["姉さん (nee-san)", "Big sis (when Kanon addresses Ayame); otherwise \"Nee-san\""]] },
          { t: "Tone", items: [["Narrator voice", "Literary, past tense, spare"], ["Raizō speech", "Clipped, no contractions"], ["SFX", "Romanize and keep; no localized replacements"]] },
        ].map((sec) => (
          <div key={sec.t}>
            <div className="section-label" style={{ marginBottom: 6 }}>{sec.t}</div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              {sec.items.map(([k, v], i) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", padding: "8px 12px", borderTop: i === 0 ? "none" : "1px solid var(--line)", background: "var(--bg-1)", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: k.match(/[一-龯ぁ-ゖ]/) ? "var(--font-jp)" : "inherit" }}>{k}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{v}</span>
                  <button className="btn icon sm ghost"><Icon name="pencil" size={11} /></button>
                </div>
              ))}
              <button className="btn sm ghost" style={{ width: "100%", borderTop: "1px dashed var(--line)", justifyContent: "center", borderRadius: 0, color: "var(--fg-3)" }}><Icon name="plus" size={11} /> Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { ModelPicker, SettingsModal, ExportModal, ProjectDecisionsModal, MODELS });
