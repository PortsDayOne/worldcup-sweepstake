import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { PLAYERS, PROGRESSION, RECENT, LAST_UPDATED } from "./data.js";
import { GROUPS, OWNERS, PLAYER_COLORS } from "./groups.js";

const NAVY = "#0E1A2E";
const NAVY2 = "#16243F";
const GOLD = "#F0C446";
const GREEN = "#40C6A0";
const INK_SUB = "#8694AC";

// Upcoming fixtures — update each matchday
const FIXTURES = [
  { date: "Fri 19 Jun", time: "11pm BST", home: "Scotland",   away: "Morocco",      group: "C" },
  { date: "Sat 20 Jun", time: "12am BST", home: "Türkiye",    away: "Paraguay",      group: "D" },
  { date: "Sat 20 Jun", time: "11pm BST", home: "Netherlands",away: "Sweden",        group: "F" },
  { date: "Sun 20 Jun", time: "2am BST",  home: "Brazil",     away: "Haiti",         group: "C" },
  { date: "Sun 20 Jun", time: "2am BST",  home: "USA",        away: "Australia",     group: "D" },
  { date: "Sun 20 Jun", time: "2am BST",  home: "Germany",    away: "Ivory Coast",   group: "E" },
  { date: "Sun 21 Jun", time: "5am BST",  home: "Ecuador",    away: "Curacao",       group: "E" },
  { date: "Sun 21 Jun", time: "5am BST",  home: "Tunisia",    away: "Japan",         group: "F" },
];

// Form: compare last two progression rows
function getForm(name) {
  if (PROGRESSION.length < 2) return "same";
  const prev = PROGRESSION[PROGRESSION.length - 2][name] ?? 0;
  const curr = PROGRESSION[PROGRESSION.length - 1][name] ?? 0;
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "same";
}

function FormArrow({ name }) {
  const form = getForm(name);
  if (form === "up")   return <span style={{ color: "#40C6A0", fontSize: 15, fontWeight: 800, marginLeft: 3 }}>↑</span>;
  if (form === "down") return <span style={{ color: "#E0556E", fontSize: 15, fontWeight: 800, marginLeft: 3 }}>↓</span>;
  return <span style={{ color: INK_SUB, fontSize: 15, marginLeft: 3 }}>→</span>;
}

function Trophy() {
  const [glow, setGlow] = useState(false);
  useEffect(() => { const t = setInterval(() => setGlow(g => !g), 1200); return () => clearInterval(t); }, []);
  return <span style={{ fontSize: 24, filter: glow ? "drop-shadow(0 0 8px #F0C446) drop-shadow(0 0 16px #F0C446)" : "drop-shadow(0 0 2px #F0C44688)", transition: "filter 1.2s ease-in-out", marginRight: 4 }}>🏆</span>;
}

// Owner badge
function OwnerBadge({ team }) {
  const owner = OWNERS[team];
  if (!owner) return null;
  return <span style={{ background: PLAYER_COLORS[owner] || "#666", color: NAVY, fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, flexShrink: 0, letterSpacing: 0.5, marginLeft: 4 }}>{owner.toUpperCase()}</span>;
}

const RankTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: NAVY2, border: `1px solid ${p.color}`, borderRadius: 12, padding: "12px 16px", maxWidth: 280 }}>
      <p style={{ color: p.color, fontSize: 16, fontWeight: 800, margin: "0 0 2px" }}>{p.name} · {p.total} pts</p>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 6px" }}>{p.played} games played</p>
      <p style={{ color: "#C5D0E0", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{p.teams}</p>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div style={{ background: NAVY2, border: `1px solid ${GREEN}`, borderRadius: 12, padding: "12px 16px" }}>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 8px" }}>{label}</p>
      {sorted.map(e => (
        <div key={e.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 18, margin: "2px 0" }}>
          <span style={{ color: e.color, fontSize: 13, fontWeight: 600 }}>{e.dataKey}</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{e.value}</span>
        </div>
      ))}
    </div>
  );
};

function GroupCard({ group }) {
  const sorted = [...group.teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  return (
    <div style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px" }}>
      <p style={{ color: GREEN, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px" }}>{group.name}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 24px 24px 24px 28px", gap: 3, marginBottom: 4 }}>
        <span style={{ color: INK_SUB, fontSize: 9, letterSpacing: 1 }}>TEAM</span>
        {["GP","W","D","L","PTS"].map(h => <span key={h} style={{ color: INK_SUB, fontSize: 9, textAlign: "center" }}>{h}</span>)}
      </div>
      {sorted.map((t, i) => {
        const isTop2 = i < 2;
        return (
          <div key={t.name} style={{ display: "grid", gridTemplateColumns: "1fr 24px 24px 24px 24px 28px", gap: 3, alignItems: "center", padding: "4px 0", borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", opacity: isTop2 ? 1 : 0.65 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
              {isTop2 && <div style={{ width: 2, height: 14, borderRadius: 1, background: GREEN, flexShrink: 0 }} />}
              <span style={{ color: "#fff", fontSize: 11, fontWeight: isTop2 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
              <OwnerBadge team={t.name} />
            </div>
            {[t.gp, t.w, t.d, t.l].map((v, j) => <span key={j} style={{ color: INK_SUB, fontSize: 11, textAlign: "center" }}>{v}</span>)}
            <span style={{ color: isTop2 ? "#fff" : INK_SUB, fontSize: 12, fontWeight: 800, textAlign: "center" }}>{t.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopTeams() {
  // Flatten all teams from all groups and sort by pts then GD
  const all = GROUPS.flatMap(g => g.teams.map(t => ({ ...t, gd: t.gf - t.ga })));
  const sorted = [...all].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const top = sorted.slice(0, 16);
  return (
    <div>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>Ranked by points, then goal difference. Shows the 16 best-performing teams in the tournament so far.</p>
      <div style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 32px", gap: 4, padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {["#", "TEAM", "PTS", "GD", "GF"].map(h => <span key={h} style={{ color: INK_SUB, fontSize: 10, fontWeight: 700, letterSpacing: 1, textAlign: h === "TEAM" ? "left" : "center" }}>{h}</span>)}
        </div>
        {top.map((t, i) => {
          const medal = i === 0 ? GOLD : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : null;
          return (
            <div key={t.name} style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 32px", gap: 4, padding: "10px 14px", borderBottom: i < top.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center", background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <span style={{ color: medal || INK_SUB, fontSize: 12, fontWeight: medal ? 800 : 400, textAlign: "center" }}>{i + 1}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <OwnerBadge team={t.name} />
              </div>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, textAlign: "center" }}>{t.pts}</span>
              <span style={{ color: t.gd > 0 ? GREEN : t.gd < 0 ? "#E0556E" : INK_SUB, fontSize: 12, fontWeight: 600, textAlign: "center" }}>{t.gd > 0 ? `+${t.gd}` : t.gd}</span>
              <span style={{ color: INK_SUB, fontSize: 12, textAlign: "center" }}>{t.gf}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixturesTab() {
  // Group fixtures by date
  const byDate = FIXTURES.reduce((acc, f) => {
    if (!acc[f.date]) acc[f.date] = [];
    acc[f.date].push(f);
    return acc;
  }, {});
  return (
    <div>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>All times in UK (BST). Coloured tags show your sweepstake players' teams.</p>
      {Object.entries(byDate).map(([date, games]) => (
        <div key={date} style={{ marginBottom: 16 }}>
          <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px" }}>{date}</p>
          {games.map((g, i) => {
            const homeOwner = OWNERS[g.home];
            const awayOwner = OWNERS[g.away];
            const hasOwner = homeOwner || awayOwner;
            return (
              <div key={i} style={{ background: hasOwner ? "rgba(255,255,255,0.05)" : NAVY2, border: `1px solid ${hasOwner ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flexShrink: 0, minWidth: 62 }}>
                  <p style={{ color: GOLD, fontSize: 13, fontWeight: 700, margin: 0 }}>{g.time}</p>
                  <p style={{ color: INK_SUB, fontSize: 10, margin: 0 }}>Grp {g.group}</p>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: homeOwner ? 700 : 400 }}>{g.home}</span>
                    {homeOwner && <OwnerBadge team={g.home} />}
                  </div>
                  <span style={{ color: INK_SUB, fontSize: 12 }}>vs</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: awayOwner ? 700 : 400 }}>{g.away}</span>
                    {awayOwner && <OwnerBadge team={g.away} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function SweepstakeDashboard() {
  const [view, setView] = useState("standings");
  const ranked = [...PLAYERS].sort((a, b) => b.total - a.total);
  const leader = ranked[0];

  const tabs = [
    { id: "standings",   label: "Standings" },
    { id: "progression", label: "Progress" },
    { id: "groups",      label: "Groups" },
    { id: "fixtures",    label: "Fixtures" },
    { id: "topteams",    label: "Top Teams" },
  ];

  const tabStyle = (active) => ({
    flex: 1, padding: "8px 2px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase",
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
            <p style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}><Trophy />{leader.name}</p>
            <p style={{ color: GOLD, fontSize: 15, fontWeight: 700, margin: 0 }}>{leader.total} pts</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, margin: "0 0 16px" }}>
          {tabs.map(t => <button key={t.id} style={tabStyle(view === t.id)} onClick={() => setView(t.id)}>{t.label}</button>)}
        </div>

        {/* Chart panels */}
        {(view === "standings" || view === "progression") && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "20px 10px 12px 0", marginBottom: 16 }}>
            {view === "standings" ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ranked} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: INK_SUB, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fill: INK_SUB, fontSize: 11 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip content={<RankTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>{ranked.map(p => <Cell key={p.name} fill={p.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={PROGRESSION} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: INK_SUB, fontSize: 10 }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fill: INK_SUB, fontSize: 11 }} axisLine={false} tickLine={false} width={26} allowDecimals={false} />
                  <Tooltip content={<LineTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {PLAYERS.map(p => <Line key={p.name} type="monotone" dataKey={p.name} stroke={p.color} strokeWidth={p.name === leader.name ? 3 : 1.5} dot={{ r: 3, fill: p.color }} activeDot={{ r: 5 }} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Standings list */}
        {view === "standings" && (
          <>
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
                        <span style={{ color: INK_SUB, fontSize: 9 }}>PL {p.played}</span>
                        <FormArrow name={p.name} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

        {/* Groups — 2 per row */}
        {view === "groups" && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>Top 2 from each group advance. Best 8 third-placed teams also qualify. Coloured tags show sweepstake owner.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {GROUPS.map(g => <GroupCard key={g.name} group={g} />)}
            </div>
          </div>
        )}

        {view === "fixtures" && <FixturesTab />}
        {view === "topteams" && <TopTeams />}

        {/* Scoring key */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          {[["WIN", 3, GREEN], ["DRAW", 1, "#5896FF"], ["LOSS", 0, INK_SUB]].map(([l, n, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, border: `1.5px solid ${c}`, borderRadius: 20, padding: "5px 14px" }}>
              <span style={{ color: "#D2DAE6", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{l}</span>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: c, color: NAVY, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
            </div>
          ))}
        </div>
        <p style={{ color: "#3D4A5E", fontSize: 10, textAlign: "center", marginTop: 16 }}>World Cup 2026 Sweepstake · Win 3 · Draw 1 · Loss 0</p>
      </div>
    </div>
  );
}
