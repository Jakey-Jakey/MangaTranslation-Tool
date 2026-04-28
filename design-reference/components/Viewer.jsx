/* global React, Icon, MangaPages */
const { useRef, useState, useEffect } = React;

// Image viewer with crop tooling. Draw boxes, name them, queue them.
const Viewer = ({ pageIndex, crops, setCrops, tool, setTool, showOverlays, selectedCropId, setSelectedCropId, onAddToQueue }) => {
  const stageRef = useRef(null);
  const [drawing, setDrawing] = useState(null);
  const Page = MangaPages[pageIndex] || MangaPages[0];

  const onMouseDown = (e) => {
    if (tool !== "crop") return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setDrawing({ x, y, w: 0, h: 0 });
  };
  const onMouseMove = (e) => {
    if (!drawing) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setDrawing((d) => ({ ...d, w: x - d.x, h: y - d.y }));
  };
  const onMouseUp = () => {
    if (!drawing) return;
    const d = { ...drawing };
    let { x, y, w, h } = d;
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    if (w > 0.02 && h > 0.02) {
      const nextIndex = crops.filter(c => c.type === "speech").length + 1;
      const id = `c${Date.now()}`;
      setCrops([...crops, { id, x, y, w, h, type: "speech", label: `S${nextIndex}`, name: "" }]);
      setSelectedCropId(id);
    }
    setDrawing(null);
  };

  const pillType = (t) => t === "speech" ? "speech" : t === "sfx" ? "sfx" : "narration";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--canvas)", minWidth: 0 }}>
      {/* Viewer toolbar */}
      <div style={{ height: 38, padding: "0 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, background: "var(--bg-1)" }}>
        <div className="hstack" style={{ background: "var(--bg-2)", padding: 2, borderRadius: 6, border: "1px solid var(--line)" }}>
          <button className="btn icon sm ghost" aria-pressed={tool === "cursor"} onClick={() => setTool("cursor")} title="Select (V)"><Icon name="cursor" size={13} /></button>
          <button className="btn icon sm ghost" aria-pressed={tool === "crop"} onClick={() => setTool("crop")} title="Crop (C)"><Icon name="rectangle" size={13} /></button>
          <button className="btn icon sm ghost" aria-pressed={tool === "hand"} onClick={() => setTool("hand")} title="Pan (H)"><Icon name="hand" size={13} /></button>
        </div>
        <div style={{ width: 1, height: 18, background: "var(--line)" }} />
        <button className="btn sm ghost" title="Send full page">
          <Icon name="image" size={12} /> Send page
        </button>
        <button className="btn sm ghost" onClick={onAddToQueue} title="Add all crops to queue">
          <Icon name="queue" size={12} /> Queue crops ({crops.length})
        </button>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 11 }}>2481 × 3508 · PNG · 3.4 MB</span>
        <div style={{ width: 1, height: 18, background: "var(--line)" }} />
        <button className="btn icon sm ghost" title="Zoom out"><Icon name="zoom-out" size={13} /></button>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)", minWidth: 46, textAlign: "center" }}>72%</span>
        <button className="btn icon sm ghost" title="Zoom in"><Icon name="zoom-in" size={13} /></button>
        <button className="btn icon sm ghost" title="Fit"><Icon name="fit" size={13} /></button>
      </div>

      {/* Stage */}
      <div className="mt-scroll" style={{ flex: 1, display: "grid", placeItems: "center", padding: 28, overflow: "auto", position: "relative" }}>
        <div ref={stageRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          style={{
            position: "relative",
            width: 520, aspectRatio: "0.71",
            background: "white",
            cursor: tool === "crop" ? "crosshair" : tool === "hand" ? "grab" : "default",
            userSelect: "none",
          }}
          className="page-halo"
        >
          <div style={{ pointerEvents: "none" }}>
            <Page tone="cream" />
          </div>

          {/* crop overlays */}
          {showOverlays && crops.map((c) => {
            const sel = selectedCropId === c.id;
            return (
              <div key={c.id} onClick={(e) => { e.stopPropagation(); setSelectedCropId(c.id); }}
                style={{
                  position: "absolute",
                  left: `${c.x * 100}%`, top: `${c.y * 100}%`,
                  width: `${c.w * 100}%`, height: `${c.h * 100}%`,
                  border: `1.5px solid var(--crop-${c.type})`,
                  background: sel ? `color-mix(in oklab, var(--crop-${c.type}) 15%, transparent)` : `color-mix(in oklab, var(--crop-${c.type}) 6%, transparent)`,
                  boxShadow: sel ? `0 0 0 2px color-mix(in oklab, var(--crop-${c.type}) 35%, transparent)` : "none",
                  cursor: "pointer",
                  borderRadius: 2,
                }}>
                <div style={{
                  position: "absolute", top: -22, left: -1,
                  padding: "2px 7px", borderRadius: "3px 3px 0 0",
                  background: `var(--crop-${c.type})`, color: "#fff",
                  fontSize: 10, fontWeight: 600, letterSpacing: ".04em", fontFamily: "var(--font-mono)",
                  display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap",
                }}>
                  {c.label}{c.name ? <span style={{ opacity: 0.85, fontFamily: "var(--font-sans)", fontWeight: 500 }}>· {c.name}</span> : null}
                </div>
                {/* handles */}
                {sel && ["nw","ne","sw","se"].map((p) => (
                  <div key={p} style={{
                    position:"absolute",
                    width: 7, height: 7, background: "#fff",
                    border: `1.5px solid var(--crop-${c.type})`,
                    borderRadius: 1,
                    ...(p.includes("n") ? { top: -4 } : { bottom: -4 }),
                    ...(p.includes("w") ? { left: -4 } : { right: -4 }),
                  }} />
                ))}
              </div>
            );
          })}

          {/* active drawing */}
          {drawing && (
            <div style={{
              position: "absolute",
              left: `${(drawing.w < 0 ? drawing.x + drawing.w : drawing.x) * 100}%`,
              top: `${(drawing.h < 0 ? drawing.y + drawing.h : drawing.y) * 100}%`,
              width: `${Math.abs(drawing.w) * 100}%`,
              height: `${Math.abs(drawing.h) * 100}%`,
              border: "1.5px dashed var(--accent)",
              background: "color-mix(in oklab, var(--accent) 10%, transparent)",
              pointerEvents: "none",
            }} />
          )}
        </div>
      </div>

      {/* footer status */}
      <div style={{ height: 26, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, padding: "0 12px", fontSize: 11, color: "var(--fg-3)", background: "var(--bg-1)" }}>
        <span className="hstack" style={{ gap: 6 }}><Icon name="check-circle" size={11} style={{ color: "var(--success)" }} /> Saved · just now</span>
        <span>·</span>
        <span>{crops?.length || 0} crops · {crops?.filter(c => c.type === "speech").length || 0} speech</span>
        <span style={{ flex: 1 }} />
        <span className="kbd">V</span> Select
        <span className="kbd">C</span> Crop
        <span className="kbd">⇧⏎</span> Send
      </div>
    </div>
  );
};

Object.assign(window, { Viewer });
