/* global React, Icon, MangaPages, MangaPageTitles */
const { useState, useRef, useEffect } = React;

// Left-edge collapsible vertical page strip.
const PageStrip = ({ pages, current, setCurrent, collapsed, setCollapsed }) => {
  if (collapsed) {
    return (
      <div style={{ width: 36, borderRight: "1px solid var(--line)", background: "var(--bg-1)", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", gap: 8 }}>
        <button className="btn icon sm ghost" title="Expand pages" onClick={() => setCollapsed(false)}>
          <Icon name="chevron-right" size={13} />
        </button>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--fg-3)", marginTop: 8 }}>
          {pages.length} pages · p.{String(current + 1).padStart(2, "0")}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 152, borderRight: "1px solid var(--line)", background: "var(--bg-1)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 10px 6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="section-label">Pages</div>
        <div className="hstack" style={{ gap: 2 }}>
          <button className="btn icon sm ghost" title="Add pages"><Icon name="plus" size={13} /></button>
          <button className="btn icon sm ghost" title="Collapse" onClick={() => setCollapsed(true)}><Icon name="chevron-left" size={13} /></button>
        </div>
      </div>
      <div className="scroll-y mt-scroll" style={{ flex: 1, padding: "4px 10px 12px 12px" }}>
        {pages.map((Page, i) => {
          const isActive = i === current;
          return (
            <div key={i} onClick={() => setCurrent(i)} style={{
              marginBottom: 8, cursor: "pointer", position: "relative",
              borderRadius: 6, overflow: "hidden",
              border: `1.5px solid ${isActive ? "var(--accent)" : "transparent"}`,
              boxShadow: isActive ? "0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent)" : "none",
            }}>
              <div style={{ aspectRatio: "0.71", background: "var(--canvas)", pointerEvents: "none" }}>
                <Page tone="cream" />
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px",
                background: "linear-gradient(to top, rgba(0,0,0,.75), transparent)",
                color: "#fff", fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ opacity: 0.75, fontFamily: "var(--font-mono)", fontSize: 9 }}>{MangaPageTitles[i]?.slice(-6) || ""}</span>
              </div>
              {i === 0 && <div style={{ position: "absolute", top: 4, right: 4, padding: "1px 6px", background: "var(--accent)", color: "#fff", fontSize: 9, borderRadius: 3, fontWeight: 600 }}>12</div>}
            </div>
          );
        })}
        <button className="btn sm ghost" style={{ width: "100%", justifyContent: "center", borderStyle: "dashed", border: "1px dashed var(--line-strong)", color: "var(--fg-3)" }}>
          <Icon name="plus" size={12} /> Add
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { PageStrip });
