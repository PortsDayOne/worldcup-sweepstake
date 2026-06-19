import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { PLAYERS, PROGRESSION, RECENT, LAST_UPDATED } from "./data.js";
import { GROUPS, OWNERS, PLAYER_COLORS } from "./groups.js";

const NAVY = "#0E1A2E";
const NAVY2 = "#16243F";
const GOLD = "#F0C446";
const GREEN = "#40C6A0";
const INK_SUB = "#8694AC";

// Compute form by comparing last two progression rows
function getForm(playerName) {
  if (PROGRESSION.length < 2) return "same";
  const prev = PROGRESSION[PROGRESSION.length - 2][playerName] ?? 0;
  const curr = PROGRESSION[PROGRESSION.length - 1][playerName] ?? 0;
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "same";
}

function FormArrow({ name }) {
  const form = getForm(name);
  if (form === "up")   return <span style={{ color: "#40C6A0", fontSize: 16, fontWeight: 800, marginLeft: 4 }}>↑</span>;
  if (form === "down") return <span style={{ color: "#E0556E", fontSize: 16, fontWeight: 800, marginLeft: 4 }}>↓</span>;
  return <span style={{ color: INK_SUB, fontSize: 16, marginLeft: 4 }}>→</span>;
}

// Animated trophy for leader
function Trophy() {
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setGlow(g => !g), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      fontSize: 28,
      filter: glow ? "drop-shadow(0 0 8px #F0C446) drop-shadow(0 0 16px #F0C446)" : "drop-shadow(0 0 2px #F0C44688)",
      transition: "filter 1.2s ease-in-out",
      marginRight: 6,
      display: "inline-block",
    }}>🏆</span>
  );
}

const RankTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div style={{ background: NAVY2, border: `1px solid ${p.color}`, borderRadius: 12, padding: "12px 16px", maxWidth: 280 }}>
        <p style={{ color: p.color, fontSize: 16, fontWeight: 800, margin: "0 0 2px" }}>{p.name} · {p.total} pts</p>
        <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 6px" }}>{p.played} game{p.played === 1 ? "" : "s"} played</p>
        <p style={{ color: "#C5D0E0", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{p.teams}</p>
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

function GroupCard({ group }) {
  const sorted = [...group.teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  return (
    <div style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
      <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" }}>{group.name}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 28px 28px 28px 28px 32px", gap: 4, marginBottom: 6 }}>
        <span style={{ color: INK_SUB, fontSize: 10, letterSpacing: 1 }}>TEAM</span>
        {["GP","W","D","L","PTS"].map(h => (
          <span key={h} style={{ color: INK_SUB, fontSize: 10, textAlign: "center", letterSpacing: 1 }}>{h}</span>
        ))}
      </div>
      {sorted.map((t, i) => {
        const owner = OWNERS[t.name];
        const ownerColor = PLAYER_COLORS[owner] || "#666";
        const isTop2 = i < 2;
        return (
          <div key={t.name} style={{
            display: "grid", gridTemplateColumns: "1fr 28px 28px 28px 28px 32px", gap: 4,
            alignItems: "center", padding: "6px 0",
            borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            opacity: isTop2 ? 1 : 0.7,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {isTop2 && <div style={{ width: 3, height: 16, borderRadius: 2, background: GREEN, flexShrink: 0 }} />}
              <span style={{ color: "#fff", fontSize: 13, fontWeight: isTop2 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
              {owner && (
                <span style={{ background: ownerColor, color: NAVY, fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, flexShrink: 0, letterSpacing: 0.5 }}>
                  {owner.toUpperCase()}
                </span>
              )}
            </div>
            {[t.gp, t.w, t.d, t.l].map((v, j) => (
              <span key={j} style={{ color: INK_SUB, fontSize: 12, textAlign: "center" }}>{v}</span>
            ))}
            <span style={{ color: isTop2 ? "#fff" : INK_SUB, fontSize: 13, fontWeight: 800, textAlign: "center" }}>{t.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SweepstakeDashboard() {
  const [view, setView] = useState("standings");
  const ranked = [...PLAYERS].sort((a, b) => b.total - a.total);
  const leader = ranked[0];

  const tabStyle = (active) => ({
    flex: 1, padding: "10px 6px", borderRadius: 10, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
    background: active ? GREEN : "rgba(255,255,255,0.05)",
    color: active ? NAVY : INK_SUB, transition: "all 0.2s",
  });

  return (
    <div style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`, minHeight: "100vh", fontFamily: "'Inter','Helvetica Neue',sans-serif", padding: "20px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ color: GREEN, fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px" }}>World Cup 2026</p>
            <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: -1, lineHeight: 1 }}>Sweepstake</h1>
            <p style={{ color: INK_SUB, fontSize: 12, margin: "6px 0 0" }}>Updated {LAST_UPDATED}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: GREEN, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 2px" }}>Leader</p>
            <p style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>
              <Trophy />{leader.name}
            </p>
            <p style={{ color: GOLD, fontSize: 15, fontWeight: 700, margin: 0 }}>{leader.total} pts</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, margin: "0 0 16px" }}>
          {["standings","progression","groups"].map(t => (
            <button key={t} style={tabStyle(view === t)} onClick={() => setView(t)}>
              {t === "standings" ? "Standings" : t === "progression" ? "Progression" : "Groups"}
            </button>
          ))}
        </div>

        {/* Charts */}
        {view !== "groups" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "20px 10px 12px 0px", marginBottom: 16 }}>
            {view === "standings" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ranked} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: INK_SUB, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fill: INK_SUB, fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                  <Tooltip content={<RankTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {ranked.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={PROGRESSION} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: INK_SUB, fontSize: 10 }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fill: INK_SUB, fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip content={<LineTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {PLAYERS.map((p) => (
                    <Line key={p.name} type="monotone" dataKey={p.name} stroke={p.color}
                      strokeWidth={p.name === leader.name ? 3 : 1.5}
                      dot={{ r: 3, fill: p.color }} activeDot={{ r: 5 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Standings list */}
        {view === "standings" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 8, marginBottom: 16 }}>
            {ranked.map((p, i) => {
              const medal = ["#F0C446","#C0C0C0","#CD7F32"][i];
              return (
                <div key={p.name} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 12px", borderBottom: i < ranked.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: medal || "rgba(255,255,255,0.08)", color: medal ? NAVY : INK_SUB, fontWeight: 800, fontSize: 13, marginTop: 2 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 3px" }}>{p.name}</p>
                    <p style={{ color: INK_SUB, fontSize: 11.5, margin: 0, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>{p.teams}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${p.color}` }}>
                      <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{p.total}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ color: INK_SUB, fontSize: 9, letterSpacing: 0.5 }}>PL {p.played}</span>
                      <FormArrow name={p.name} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Groups tab */}
        {view === "groups" && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>
              Top 2 from each group advance automatically. Best 8 third-placed teams also qualify. Coloured tags show your sweepstake owner.
            </p>
            {GROUPS.map(g => <GroupCard key={g.name} group={g} />)}
          </div>
        )}

        {/* Latest results */}
        {view === "standings" && (
          <>
            <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" }}>Latest results</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
              {RECENT.map((m, i) => {
                const wa = m.ga > m.gb, wb = m.gb > m.ga;
                return (
                  <div key={i} style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>
                      <span style={{ color: wa ? "#fff" : INK_SUB }}>{m.ga}</span>
                      <span style={{ color: INK_SUB, margin: "0 6px" }}>–</span>
                      <span style={{ color: wb ? "#fff" : INK_SUB }}>{m.gb}</span>
                    </p>
                    <p style={{ color: "#B6C2D6", fontSize: 11.5, margin: 0, lineHeight: 1.4 }}>{m.a} v {m.b}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Scoring key */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[["WIN", 3, GREEN], ["DRAW", 1, "#5896FF"], ["LOSS", 0, INK_SUB]].map(([l, n, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, border: `1.5px solid ${c}`, borderRadius: 20, padding: "5px 14px" }}>
              <span style={{ color: "#D2DAE6", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{l}</span>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: c, color: NAVY, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
            </div>
          ))}
        </div>

        <p style={{ color: "#3D4A5E", fontSize: 10, textAlign: "center", marginTop: 20 }}>World Cup 2026 Sweepstake · Win 3 · Draw 1 · Loss 0</p>
      </div>
    </div>
  );
}
