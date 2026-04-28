/* global React, Icon */
// Right-edge collapsible crop queue sidebar.
const CropQueue = ({ crops, queue, setQueue, onClose, onSendOne, onSendQueue }) => {
  const move = (i, dir) => {
    const next = [...queue];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setQueue(next);
  };
  return (
    <div style={{ width: 240, borderLeft: "1px solid var(--line)", background: "var(--bg-1)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 10px 8px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
        <div className="section-label">Crop queue</div>
        <span className="pill" style={{ marginLeft: 6, fontSize: 10 }}>{queue.length}</span>
        <span style={{ flex: 1 }} />
        <button className="btn icon sm ghost" onClick={onClose}><Icon name="close" size={12} /></button>
      </div>
      <div className="mt-scroll scroll-y" style={{ flex: 1, padding: 8 }}>
        {queue.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: "var(--fg-3)", textAlign: "center", border: "1px dashed var(--line)", borderRadius: 8 }}>
            Draw a crop on the page to add it here.
          </div>
        )}
        {queue.map((c, i) => (
          <div key={c.id} draggable style={{
            border: "1px solid var(--line)", borderRadius: 7, padding: 8,
            background: "var(--bg-2)", marginBottom: 6,
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center",
          }}>
            <button className="btn icon sm ghost" style={{ cursor: "grab" }}><Icon name="drag" size={12} /></button>
            <div style={{ minWidth: 0 }}>
              <div className="hstack" style={{ gap: 6 }}>
                <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{i + 1}.</span>
                <span className={`pill dot ${c.type}`} style={{ fontFamily: "var(--font-mono)" }}>{c.label}</span>
              </div>
              <input
                placeholder="Add note…"
                defaultValue={c.name}
                style={{ marginTop: 4, width: "100%", padding: "3px 6px", background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--fg-1)", fontSize: 11 }}
              />
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <button className="btn icon sm ghost" style={{ width: 20, height: 20 }} onClick={() => move(i, -1)}><Icon name="chevron-down" size={10} style={{ transform: "rotate(180deg)" }} /></button>
              <button className="btn icon sm ghost" style={{ width: 20, height: 20 }} onClick={() => move(i, 1)}><Icon name="chevron-down" size={10} /></button>
            </div>
          </div>
        ))}
      </div>
      {queue.length > 0 && (
        <div style={{ padding: 8, borderTop: "1px solid var(--line)", display: "grid", gap: 6 }}>
          <button className="btn sm" onClick={onSendOne}><Icon name="send" size={12} /> Send one at a time</button>
          <button className="btn sm primary" onClick={onSendQueue}><Icon name="send" size={12} /> Send queue as one turn</button>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { CropQueue });
