/* global React, Icon */
// First-launch onboarding modal: pick workspace, import source, OR skip.

const Onboarding = ({ onClose, initialStep = 1 }) => {
  const [step, setStep] = React.useState(initialStep);
  const [workspace, setWorkspace] = React.useState("~/Documents/MangaTranslator");
  const [mode, setMode] = React.useState("copy"); // copy | inplace

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,9,0.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 640, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 14,
        boxShadow: "var(--shadow-lg)", overflow: "hidden",
      }}>
        <div style={{ padding: "24px 28px 0 28px" }}>
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <div className="hstack" style={{ gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                <Icon name="logo" size={18} />
              </span>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Welcome to MangaTranslator</div>
            </div>
            <button className="btn sm ghost" onClick={onClose}><Icon name="close" size={14} /></button>
          </div>
          <div style={{ color: "var(--fg-3)", fontSize: 13, marginTop: 6 }}>Two quick steps, or skip and we'll use the default workspace.</div>

          <div className="hstack" style={{ marginTop: 18, marginBottom: 14, gap: 6 }}>
            {[0, 1, 2].map((n) => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? "var(--accent)" : "var(--bg-3)" }} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div style={{ padding: "0 28px 24px 28px" }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Step 0 · Connect OpenRouter</div>
            <div style={{ color: "var(--fg-2)", fontSize: 13, marginBottom: 14 }}>
              Sign in with your OpenRouter account to get instant access to 300+ models. You can skip and use MangaTranslator in read-only mode.
            </div>
            <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-2)", display: "grid", gap: 10 }}>
              <div className="hstack" style={{ gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), #8A4BFF)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>OR</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Sign in with OpenRouter</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Opens your browser for OAuth · PKCE flow, no secrets stored</div>
                </div>
                <span style={{ flex: 1 }} />
                <button className="btn primary" onClick={() => setStep(1)}>Connect <Icon name="chevron-right" size={12} /></button>
              </div>
            </div>
            <div className="hstack" style={{ gap: 10, marginTop: 10, fontSize: 12, color: "var(--fg-3)" }}>
              <Icon name="info" size={12} />
              <span>Prefer to paste a key? <u>Use an API key instead</u></span>
            </div>
            <div className="hstack" style={{ justifyContent: "space-between", marginTop: 22 }}>
              <button className="btn ghost" onClick={onClose}>Skip — decide later</button>
              <button className="btn" onClick={() => setStep(1)}>Continue without account</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ padding: "0 28px 24px 28px" }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Step 1 · Workspace folder</div>
            <div style={{ color: "var(--fg-2)", fontSize: 13, marginBottom: 14 }}>
              Where should projects, crops, scratchpads, and exports live? We'll create a folder for each project inside this location.
            </div>
            <div className="hstack" style={{ gap: 8 }}>
              <div className="inp hstack" style={{ padding: "0 10px", gap: 8 }}>
                <Icon name="folder" size={14} style={{ color: "var(--fg-3)" }} />
                <input className="inp" style={{ padding: 0, border: 0, background: "transparent", height: 28 }} value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
              </div>
              <button className="btn">Choose…</button>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              {["~/Documents/MangaTranslator", "~/Desktop/Translations", "~/Library/MangaTranslator"].map((p) => (
                <button key={p} className="btn sm ghost" onClick={() => setWorkspace(p)} style={{ fontSize: 11, color: "var(--fg-3)" }}>{p}</button>
              ))}
            </div>
            <div className="hstack" style={{ justifyContent: "space-between", marginTop: 22 }}>
              <button className="btn ghost" onClick={onClose}>Skip — use defaults</button>
              <button className="btn primary" onClick={() => setStep(2)}>Continue <Icon name="chevron-right" size={12} /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: "0 28px 24px 28px" }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Step 2 · Import your first project</div>
            <div style={{ color: "var(--fg-2)", fontSize: 13, marginBottom: 14 }}>
              Drop a folder, a ZIP, or individual images. PDFs are supported too.
            </div>

            <div style={{
              border: "1.5px dashed var(--line-strong)", borderRadius: 10,
              padding: 28, textAlign: "center", background: "var(--bg-2)",
              display: "grid", gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, color: "var(--fg-3)" }}>
                <Icon name="archive" size={24} /><Icon name="folder" size={24} /><Icon name="image" size={24} /><Icon name="pdf" size={24} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Drop files here</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>or</div>
              <div className="hstack" style={{ justifyContent: "center", gap: 6 }}>
                <button className="btn">Browse files</button>
                <button className="btn">Choose folder</button>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <label className="hstack" style={{ gap: 10, padding: 10, border: `1px solid ${mode === "copy" ? "var(--accent)" : "var(--line)"}`, borderRadius: 8, cursor: "pointer", background: mode === "copy" ? "var(--accent-soft)" : "transparent" }}>
                <input type="radio" checked={mode === "copy"} onChange={() => setMode("copy")} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Copy into workspace <span className="pill sm" style={{ marginLeft: 6 }}>recommended</span></div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Originals are left untouched. MangaTranslator works on copies.</div>
                </div>
              </label>
              <label className="hstack" style={{ gap: 10, padding: 10, border: `1px solid ${mode === "inplace" ? "var(--accent)" : "var(--line)"}`, borderRadius: 8, cursor: "pointer", background: mode === "inplace" ? "var(--accent-soft)" : "transparent" }}>
                <input type="radio" checked={mode === "inplace"} onChange={() => setMode("inplace")} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Work in place</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Point to an existing folder and use it directly.</div>
                </div>
              </label>
            </div>

            <div className="hstack" style={{ justifyContent: "space-between", marginTop: 22 }}>
              <button className="btn ghost" onClick={() => setStep(1)}><Icon name="chevron-left" size={12} /> Back</button>
              <div className="hstack" style={{ gap: 8 }}>
                <button className="btn ghost" onClick={onClose}>Do this later</button>
                <button className="btn primary" onClick={onClose}>Create project</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { Onboarding });
