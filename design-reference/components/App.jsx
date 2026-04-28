/* global React, Chrome, PageStrip, Viewer, ChatPanel, Workbench, Onboarding, ModelPicker, SettingsModal, ExportModal, ProjectDecisionsModal, MangaPages, Icon, MODELS */

const { useState, useEffect } = React;

const SAMPLE_CROPS = [
  { id: "c1", x: 0.07,  y: 0.084, w: 0.30, h: 0.056, type: "narration", label: "N1", name: "train announcement" },
  { id: "c2", x: 0.32,  y: 0.344, w: 0.22, h: 0.090, type: "speech",    label: "S1", name: "you're late" },
  { id: "c3", x: 0.62,  y: 0.365, w: 0.22, h: 0.090, type: "sfx",       label: "SFX1", name: "heartbeat" },
  { id: "c4", x: 0.58,  y: 0.558, w: 0.30, h: 0.076, type: "speech",    label: "S2", name: "had to make sure" },
  { id: "c5", x: 0.60,  y: 0.915, w: 0.23, h: 0.050, type: "speech",    label: "S3", name: "run." },
];

function TypesettingPlaceholder() {
  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", background: "var(--bg-0)", padding: 40, overflow: "auto" }}>
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", margin: "0 auto 18px", color: "var(--fg-3)" }}>
          <Icon name="type" size={26} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>Typesetting</div>
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--fg-3)", lineHeight: 1.6 }}>
          Place final translations back onto the page — with text-clearing, balloon fills, and
          typesetting tools. Queued for after translation feels excellent.
        </div>
        <div style={{ marginTop: 20, padding: 14, border: "1px dashed var(--line-strong)", borderRadius: 10, background: "var(--bg-1)", textAlign: "left", display: "grid", gap: 8 }}>
          <div className="section-label" style={{ color: "var(--fg-3)" }}>Shipping order</div>
          {[
            ["Image cleaning (inpainting / flatten balloons)", "next"],
            ["Text-box placement linked to workbench finals", "queued"],
            ["Font management & per-character style rules", "queued"],
            ["Export to layered PSD / flat PNG", "queued"],
          ].map(([l, s]) => (
            <div key={l} className="hstack" style={{ gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: s === "next" ? "var(--accent-soft)" : "var(--bg-3)", color: s === "next" ? "var(--accent)" : "var(--fg-4)", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700 }}>•</span>
              <span style={{ fontSize: 13, color: "var(--fg-2)", flex: 1 }}>{l}</span>
              <span className="pill" style={{ fontSize: 10, color: s === "next" ? "var(--accent)" : "var(--fg-3)" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MangaTranslator({ theme = "dark", density = "balanced", accent = "#FF5A3C", showOverlays = true, pageIndex: initialPage = 0, showOnboarding = false, onboardingStep = 1, openModal = null, settingsTab = "prompt", startMode = "translation" }) {
  const [mode, setMode] = useState(startMode);
  const [loggedIn, setLoggedIn] = useState(true);
  const [pageIndex, setPageIndex] = useState(initialPage);
  const [stripCollapsed, setStripCollapsed] = useState(false);
  const [tool, setTool] = useState("crop");
  const [crops, setCrops] = useState(SAMPLE_CROPS);
  const [selectedCropId, setSelectedCropId] = useState("c2");
  const [queue, setQueue] = useState([SAMPLE_CROPS[1], SAMPLE_CROPS[2], SAMPLE_CROPS[3]]);
  const [model, setModel] = useState(MODELS[0]);

  const [onboarding, setOnboarding] = useState(showOnboarding);
  const [modelPickerOpen, setModelPickerOpen] = useState(openModal === "model");
  const [settingsOpen, setSettingsOpen] = useState(openModal === "settings");
  const [exportOpen, setExportOpen] = useState(openModal === "export");
  const [decisionsOpen, setDecisionsOpen] = useState(openModal === "decisions");

  return (
    <div className="app-shell" data-theme={theme} data-density={density} style={{ "--accent": accent, position: "relative", contain: "layout paint" }}>
      <Chrome
        mode={mode} setMode={setMode}
        loggedIn={loggedIn} setLoggedIn={setLoggedIn}
        onOpenModelPicker={() => setModelPickerOpen(true)}
        model={model}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenExport={() => setExportOpen(true)}
      />
      {mode === "translation" ? (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 340px 360px", minHeight: 0 }}>
          <PageStrip pages={MangaPages} current={pageIndex} setCurrent={setPageIndex} collapsed={stripCollapsed} setCollapsed={setStripCollapsed} />
          <Viewer
            pageIndex={pageIndex} crops={crops} setCrops={setCrops}
            tool={tool} setTool={setTool}
            showOverlays={showOverlays}
            selectedCropId={selectedCropId} setSelectedCropId={setSelectedCropId}
            onAddToQueue={() => setQueue(crops)}
          />
          <Workbench onOpenDecisions={() => setDecisionsOpen(true)} />
          <ChatPanel crops={crops} queue={queue} setQueue={setQueue} onPromoteToScratchpad={() => {}} />
        </div>
      ) : (
        <TypesettingPlaceholder />
      )}

      {onboarding && <Onboarding onClose={() => setOnboarding(false)} initialStep={onboardingStep} />}
      {modelPickerOpen && <ModelPicker onClose={() => setModelPickerOpen(false)} selected={model} onSelect={(m) => { setModel(m); setModelPickerOpen(false); }} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} initialTab={settingsTab} />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
      {decisionsOpen && <ProjectDecisionsModal onClose={() => setDecisionsOpen(false)} />}
    </div>
  );
}

Object.assign(window, { MangaTranslator, TypesettingPlaceholder });
