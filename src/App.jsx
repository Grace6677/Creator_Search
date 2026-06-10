import { useState } from "react";
import Papa from "papaparse";

const FIELDS = [
  "handle", "name", "followers", "engagement_rate",
  "niche", "location", "content_type", "why_match", "source", "confidence",
];

async function discover(filters) {
  const res = await fetch("/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filters }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  if (data.note && (!data.creators || !data.creators.length)) throw new Error(data.note);
  return data.creators || [];
}

const C = {
  bg: "#ffffff", bg2: "#f6f6f4", border: "#e3e3e0",
  text: "#1a1a18", muted: "#6b6b66", accent: "#c45f3c", danger: "#b3261e", radius: "10px",
};
const conf = {
  high: { bg: "#e6f4ea", fg: "#1e7d34" },
  medium: { bg: "#fdf3e0", fg: "#9a6700" },
  low: { bg: "#fce8e6", fg: "#b3261e" },
};

export default function App() {
  const [f, setF] = useState({
    niche: "", location: "", fMin: "", fMax: "", engMin: "",
    contentType: "Any", brandSafe: false, exclude: "", notes: "", count: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function run() {
    setError(""); setRows(null); setLoading(true);
    try {
      const r = await discover(f);
      setRows(r);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const csv = Papa.unparse(rows.map((r) => {
      const o = {}; FIELDS.forEach((k) => { o[k] = r[k] ?? ""; }); return o;
    }));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "creators.csv"; a.click();
  }
  async function copyTSV() {
    const header = FIELDS.join("\t");
    const b = rows.map((r) => FIELDS.map((k) => r[k] ?? "").join("\t")).join("\n");
    await navigator.clipboard.writeText(header + "\n" + b);
  }

  const gaps = rows ? rows.filter((r) => r.followers == null || r.engagement_rate == null).length : 0;
  const input = { width: "100%", padding: "8px 10px", fontSize: 14, border: `1px solid ${C.border}`, borderRadius: C.radius, background: C.bg, color: C.text, boxSizing: "border-box" };
  const label = { fontSize: 12, color: C.muted, marginBottom: 4, display: "block" };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", color: C.text, background: C.bg, padding: 20, maxWidth: 980, margin: "0 auto", minHeight: "100vh" }}>
      <div style={{ marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Creator Discovery Agent</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
        Set filters. It searches the web for matching Indian creators and builds a shortlist you can export.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: 16, border: `1px solid ${C.border}`, borderRadius: C.radius, background: C.bg2, marginBottom: 16 }}>
        <div><label style={label}>Niche / category</label><input style={input} placeholder="food, lifestyle" value={f.niche} onChange={(e) => set("niche", e.target.value)} /></div>
        <div><label style={label}>Location</label><input style={input} placeholder="Mumbai, Delhi" value={f.location} onChange={(e) => set("location", e.target.value)} /></div>
        <div><label style={label}>Content type</label><select style={input} value={f.contentType} onChange={(e) => set("contentType", e.target.value)}><option>Any</option><option>Reels</option><option>Posts</option><option>Mixed</option></select></div>
        <div><label style={label}>Followers min</label><input style={input} placeholder="50000" value={f.fMin} onChange={(e) => set("fMin", e.target.value)} /></div>
        <div><label style={label}>Followers max</label><input style={input} placeholder="500000" value={f.fMax} onChange={(e) => set("fMax", e.target.value)} /></div>
        <div><label style={label}>Min engagement %</label><input style={input} placeholder="4" value={f.engMin} onChange={(e) => set("engMin", e.target.value)} /></div>
        <div><label style={label}>Avoid prior collabs (brands)</label><input style={input} placeholder="competitor names" value={f.exclude} onChange={(e) => set("exclude", e.target.value)} /></div>
        <div><label style={label}>How many</label><input style={input} type="number" min={1} max={15} value={f.count} onChange={(e) => set("count", e.target.value)} /></div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={f.brandSafe} onChange={(e) => set("brandSafe", e.target.checked)} />Brand-safe only
          </label>
        </div>
        <div style={{ gridColumn: "1 / -1" }}><label style={label}>Other notes (optional)</label><input style={input} placeholder="vernacular creators, tier-2 cities, etc." value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>

      <button onClick={run} disabled={loading} style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, background: C.accent, color: "#fff", border: "none", borderRadius: C.radius, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Searching the web..." : "Find creators"}
      </button>

      {error && <div style={{ marginTop: 16, padding: 12, borderRadius: C.radius, background: "#fce8e6", color: C.danger, fontSize: 13 }}>{error}</div>}

      {rows && rows.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              {rows.length} creators found
              {gaps > 0 && <span style={{ color: "#9a6700" }}>{"  ·  "}{gaps} with missing follower or engagement data (verify before use)</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyTSV} style={{ padding: "7px 12px", fontSize: 13, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: C.radius, cursor: "pointer" }}>Copy for Sheets</button>
              <button onClick={exportCSV} style={{ padding: "7px 12px", fontSize: 13, background: C.text, color: C.bg, border: "none", borderRadius: C.radius, cursor: "pointer" }}>Export CSV</button>
            </div>
          </div>
          <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: C.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: C.bg2, textAlign: "left" }}>
                {["Handle", "Followers", "Eng %", "Niche", "Location", "Type", "Why match", "Confidence"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const cc = conf[r.confidence] || conf.low;
                  const cell = { padding: "8px 10px", borderTop: `1px solid ${C.border}`, verticalAlign: "top" };
                  const dash = (v) => (v == null || v === "" ? <span style={{ color: C.muted }}>—</span> : v);
                  return (
                    <tr key={i}>
                      <td style={{ ...cell, fontWeight: 600, whiteSpace: "nowrap" }}>{r.handle}{r.name && <div style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}>{r.name}</div>}</td>
                      <td style={cell}>{dash(r.followers != null ? Number(r.followers).toLocaleString("en-IN") : null)}</td>
                      <td style={cell}>{dash(r.engagement_rate)}</td>
                      <td style={cell}>{dash(r.niche)}</td>
                      <td style={cell}>{dash(r.location)}</td>
                      <td style={cell}>{dash(r.content_type)}</td>
                      <td style={{ ...cell, maxWidth: 220, color: C.muted }}>{dash(r.why_match)}</td>
                      <td style={cell}><span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: cc.bg, color: cc.fg, textTransform: "capitalize" }}>{r.confidence || "low"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
            Data comes from public web sources and may be self-reported or dated. Confidence flags reflect reliability. Verify follower and engagement figures before outreach or pitching.
          </div>
        </div>
      )}
    </div>
  );
}
