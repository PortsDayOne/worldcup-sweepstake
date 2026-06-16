import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { PLAYERS, PROGRESSION, RECENT, LAST_UPDATED } from "./data.js";

const NAVY = "#0E1A2E";
const NAVY2 = "#16243F";
const GOLD = "#F0C446";
const GREEN = "#40C6A0";
const INK_SUB = "#8694AC";

const RankTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div style={{ background: NAVY2, border: `1px solid ${p.color}`, borderRadius: 12, padding: "12px 16px", maxWidth: 260 }}>
        <p style={{ color: p.color, fontSize: 18, fontWeight: 800, margin: "0 0 2px" }}>{p.name} · {p.total} pts</p>
        <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 6px" }}>{p.played} game{p.played === 1 ? "" : "s"} played</p>
        <p style={{ color: "#C5D0E0", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{p.teams}</p>
      </div>
    );
  }
  return null;
};

const LineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sorted = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div style={{ background: NAVY2, border: `1px solid ${GREEN}`, borderRadius: 12, padding: "12px 16px" }}>
        <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 8px", letterSpacing: 1 }}>{label}</p>
        {sorted.map((e) => (
          <div key={e.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 18, margin: "2px 0" }}>
            <span style={{ color: e.color, fontSize: 13, fontWeight: 600 }}>{e.dataKey}</span>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{e.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SweepstakeDashboard() {
  const [view, setView] = useState("standings");
  const ranked = [...PLAYERS].sort((a, b) => b.total - a.total);
  const leader = ranked[0];

  const tabStyle = (active) => ({
    flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
    background: active ? GREEN : "rgba(255,255,255,0.05)",
    color: active ? NAVY : INK_SUB, transition: "all 0.2s",
  });

  return (
    <div style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`,
      minHeight: "100vh", fontFamily: "'Inter','Helvetica Neue',sans-serif",
      padding: "24px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 760 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <p style={{ color: GREEN, fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px" }}>World Cup 2026</p>
            <h1 style={{ color: "#fff", fontSize: 38, fontWeight: 900, margin: 0, letterSpacing: -1, lineHeight: 1 }}>Sweepstake</h1>
            <p style={{ color: INK_SUB, fontSize: 13, margin: "8px 0 0" }}>Updated {LAST_UPDATED}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 2px" }}>Leader</p>
            <p style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0 }}>{leader.name}</p>
            <p style={{ color: GOLD, fontSize: 16, fontWeight: 700, margin: 0 }}>{leader.total} pts</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, margin: "22px 0 20px" }}>
          <button style={tabStyle(view === "standings")} onClick={() => setView("standings")}>Standings</button>
          <button style={tabStyle(view === "progression")} onClick={() => setView("progression")}>Progression</button>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px 14px 14px 4px", marginBottom: 20 }}>
          {view === "standings" ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={ranked} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: INK_SUB, fontSize: 12 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: INK_SUB, fontSize: 12 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip content={<RankTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {ranked.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={PROGRESSION} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: INK_SUB, fontSize: 12 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: INK_SUB, fontSize: 12 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip content={<LineTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {PLAYERS.map((p) => (
                  <Line key={p.name} type="monotone" dataKey={p.name} stroke={p.color}
                    strokeWidth={p.name === leader.name ? 3.5 : 2}
                    dot={{ r: 3, fill: p.color }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 8, marginBottom: 20 }}>
          {ranked.map((p, i) => {
            const medal = ["#F0C446", "#C0C0C0", "#CD7F32"][i];
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderBottom: i < ranked.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: medal || "rgba(255,255,255,0.08)", color: medal ? NAVY : INK_SUB, fontWeight: 800, fontSize: 14 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>{p.name}</p>
                  <p style={{ color: INK_SUB, fontSize: 11.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.teams}</p>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <p style={{ color: INK_SUB, fontSize: 10, margin: 0, letterSpacing: 1 }}>PL</p>
                  <p style={{ color: "#C5D0E0", fontSize: 15, fontWeight: 600, margin: 0 }}>{p.played}</p>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${p.color}` }}>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{p.total}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ color: GREEN, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" }}>Latest results</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
          {RECENT.map((m, i) => {
            const wa = m.ga > m.gb, wb = m.gb > m.ga;
            return (
              <div key={i} style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: wa ? "#fff" : INK_SUB }}>{m.ga}</span>
                  <span style={{ color: INK_SUB, margin: "0 8px" }}>–</span>
                  <span style={{ color: wb ? "#fff" : INK_SUB }}>{m.gb}</span>
                </p>
                <p style={{ color: "#B6C2D6", fontSize: 12.5, margin: 0 }}>{m.a} v {m.b}</p>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {[["WIN", 3, GREEN], ["DRAW", 1, "#5896FF"], ["LOSS", 0, INK_SUB]].map(([l, n, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${c}`, borderRadius: 20, padding: "6px 16px" }}>
              <span style={{ color: "#D2DAE6", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{l}</span>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: c, color: NAVY, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
            </div>
          ))}
        </div>

        <p style={{ color: "#3D4A5E", fontSize: 11, textAlign: "center", marginTop: 24 }}>World Cup 2026 Sweepstake · Win 3 · Draw 1 · Loss 0</p>

      </div>
    </div>
  );
}
