/* global React, Icon */
const { useState } = React;

// Top chrome shared by both variants.
const Chrome = ({ mode, setMode, loggedIn, setLoggedIn, onOpenModelPicker, model, onOpenSettings, theme, onOpenExport, projectName = "Kagayaki Vol. 2" }) => {
  return (
    <div className="chrome">
      <div className="brand">
        <span className="dot" style={{ color: "var(--accent)" }}><Icon name="logo" size={18} /></span>
        <span>MangaTranslator</span>
      </div>
      <div className="divider" />
      <div className="project-name">
        <span className="muted">Project · </span><b>{projectName}</b>
        <Icon name="chevron-down" size={12} style={{ marginLeft: 6, color: "var(--fg-3)", verticalAlign: "middle" }} />
      </div>
      <div className="tabs" role="tablist" aria-label="App mode">
        <button aria-pressed={mode === "translation"} onClick={() => setMode("translation")}>
          <Icon name="reading" size={13} /> Translation
        </button>
        <button aria-pressed={mode === "typesetting"} onClick={() => setMode("typesetting")}>
          <Icon name="type" size={13} /> Typesetting
        </button>
      </div>
      <div className="spacer" />
      <div className="status">
        <button className="btn sm ghost" onClick={onOpenModelPicker} title="Change model">
          <Icon name="sparkle" size={12} style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--fg-1)", fontWeight: 500 }}>{model.label}</span>
          <Icon name="chevron-down" size={11} style={{ color: "var(--fg-3)" }} />
        </button>
        <div className="divider" />
        <button className="btn sm ghost" onClick={onOpenExport} title="Export">
          <Icon name="download" size={13} /> Export
        </button>
        <button className="btn sm ghost" onClick={onOpenSettings} title="Settings">
          <Icon name="settings" size={13} />
        </button>
        <div className="divider" />
        {loggedIn ? (
          <button className="btn sm ghost" title="OpenRouter account" style={{ gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: "linear-gradient(135deg, var(--accent), #8A4BFF)", display: "grid", placeItems: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>R</span>
            <span>ryo.k</span>
          </button>
        ) : (
          <button className="btn sm primary" onClick={() => setLoggedIn(true)}>
            <Icon name="bolt" size={12} /> Log in to OpenRouter
          </button>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { Chrome });
