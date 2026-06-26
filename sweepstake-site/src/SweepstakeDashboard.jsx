import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { PLAYERS, PROGRESSION, RECENT, LAST_UPDATED } from "./data.js";
import { GROUPS, OWNERS, PLAYER_COLORS, STRENGTH } from "./groups.js";

const NAVY = "#0E1A2E";
const NAVY2 = "#16243F";
const GOLD = "#F0C446";
const GREEN = "#40C6A0";
const INK_SUB = "#8694AC";

// Auto-derived from current standings — never hand-maintained.
// CONFIRMED = clinched a top-2 group place (guaranteed knockout, ignoring any favourable
//   head-to-head among rivals, so it only ever flags a team when it is mathematically certain).
// ELIMINATED = can no longer finish in the top 3 of its group. Because the best 8
//   third-placed teams also qualify, a team isn't out until it can't even reach 3rd.
//   For a FINISHED group the top 2 are through, the 4th-placed side is out, and the
//   3rd-placed side stays pending (its fate rests on the best-third race across groups).
function deriveStatus() {
  const confirmed = new Set();
  const eliminated = new Set();
  const rank = (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
  GROUPS.forEach(g => {
    const finished = g.teams.every(t => t.gp >= 3);
    if (finished) {
      const sorted = [...g.teams].sort(rank);
      confirmed.add(sorted[0].name);
      confirmed.add(sorted[1].name);
      eliminated.add(sorted[3].name);
    } else {
      const ts = g.teams.map(t => ({ name: t.name, pts: t.pts, max: t.pts + 3 * Math.max(0, 3 - t.gp) }));
      ts.forEach(t => {
        const canReachT = ts.filter(r => r.name !== t.name && r.max >= t.pts).length;
        if (canReachT <= 1) confirmed.add(t.name);
        const guaranteedAbove = ts.filter(r => r.name !== t.name && r.pts > t.max).length;
        if (guaranteedAbove >= 3) eliminated.add(t.name);
      });
    }
  });
  return { confirmed, eliminated };
}
const { confirmed: CONFIRMED, eliminated: ELIMINATED } = deriveStatus();

// Some team names differ between groups.js (display) and OWNERS (squad keys).
// This map lets owner lookups work regardless of which spelling is used.
const TEAM_ALIASES = {
  "Bosnia-Herzegovina": "Bosnia",
  "Turkey": "Turkiye",
  "Türkiye": "Turkiye",
  "Congo DR": "DR Congo",
  "Cape Verde Islands": "Cape Verde",
};
function ownerOf(team) {
  return OWNERS[team] || OWNERS[TEAM_ALIASES[team]] || null;
}

// Blended "Win Index": each player's overall chance of topping the sweepstake.
//   50% live World Cup title odds (STRENGTH) of their still-alive teams,
//   30% current sweepstake points, 20% number of teams through to the last 32.
// Each component is taken as a share of the 8-player total, weighted, and summed,
// so every player's % naturally adds up to 100. Eliminated teams contribute 0 title odds.
function computeWinIndex() {
  const titleEq = {}, through = {}, points = {};
  PLAYERS.forEach(p => { titleEq[p.name] = 0; through[p.name] = 0; points[p.name] = p.total; });
  GROUPS.forEach(g => g.teams.forEach(t => {
    const owner = ownerOf(t.name);
    if (!owner) return;
    if (!ELIMINATED.has(t.name)) titleEq[owner] += (STRENGTH[t.name] || 0);
    if (CONFIRMED.has(t.name)) through[owner] += 1;
  }));
  const total = obj => Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const sT = total(titleEq), sP = total(points), sThr = total(through);
  const W_TITLE = 0.5, W_PTS = 0.3, W_THR = 0.2;
  return PLAYERS.map(p => {
    const share = W_TITLE * (titleEq[p.name] / sT) + W_PTS * (points[p.name] / sP) + W_THR * (through[p.name] / sThr);
    return { name: p.name, color: p.color, pct: share * 100, titleEq: titleEq[p.name], points: points[p.name], through: through[p.name] };
  }).sort((a, b) => b.pct - a.pct);
}

// Map a team property keyed by BOTH the groups.js spelling and the OWNERS spelling,
// so owner-based lookups survive the name mismatches.
function teamMap(valueFn) {
  const m = {};
  GROUPS.forEach(g => g.teams.forEach(t => {
    const v = valueFn(t);
    m[t.name] = v;
    if (t.name in TEAM_ALIASES) m[TEAM_ALIASES[t.name]] = v;
  }));
  return m;
}

// #2 — data integrity: each player's stated total must equal the sum of their teams' group points.
function dataIntegrityIssues() {
  const pts = teamMap(t => t.pts);
  const issues = [];
  PLAYERS.forEach(p => {
    const owned = Object.keys(OWNERS).filter(t => OWNERS[t] === p.name);
    const missing = owned.filter(t => pts[t] === undefined);
    if (missing.length) { issues.push(`${p.name}: unmatched team name → ${missing.join(", ")}`); return; }
    if (owned.length !== 6) issues.push(`${p.name}: owns ${owned.length} teams (expected 6)`);
    const sum = owned.reduce((s, t) => s + pts[t], 0);
    if (sum !== p.total) issues.push(`${p.name}: total ${p.total} ≠ team sum ${sum}`);
  });
  return issues;
}

// Returns highlight colour for a team name, or null
function teamColor(name) {
  if (CONFIRMED.has(name)) return "#40C6A0";
  if (ELIMINATED.has(name)) return "#E0556E";
  return null;
}

// Renders a "Team (pts), Team (pts)" string with green/red highlights inline
function TeamsText({ text, baseColor = "#8694AC" }) {
  const parts = text.split(", ");
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^(.+?)\s*\(\d+\)/);
        const name = match ? match[1].trim() : part;
        const col = teamColor(name);
        return (
          <span key={i}>
            <span style={{ color: col || baseColor, fontWeight: col ? 700 : 400,
              textShadow: col ? `0 0 6px ${col}88` : "none" }}>{part}</span>
            {i < parts.length - 1 && <span style={{ color: baseColor }}>, </span>}
          </span>
        );
      })}
    </span>
  );
}

const FIXTURES = [
  { date: "Fri 26 Jun", time: "8pm BST", home: "Norway", away: "France", group: "I" },
  { date: "Fri 26 Jun", time: "8pm BST", home: "Senegal", away: "Iraq", group: "I" },
  { date: "Fri 26 Jun", time: "11pm BST", home: "Argentina", away: "Jordan", group: "J" },
  { date: "Fri 26 Jun", time: "11pm BST", home: "Austria", away: "Algeria", group: "J" },
  { date: "Sat 27 Jun", time: "1am BST", home: "Uruguay", away: "Spain", group: "H" },
  { date: "Sat 27 Jun", time: "1am BST", home: "Cape Verde", away: "Saudi Arabia", group: "H" },
  { date: "Sat 27 Jun", time: "4am BST", home: "Egypt", away: "Iran", group: "G" },
  { date: "Sat 27 Jun", time: "4am BST", home: "New Zealand", away: "Belgium", group: "G" },
  { date: "Sat 27 Jun", time: "8pm BST", home: "Panama", away: "England", group: "L" },
  { date: "Sat 27 Jun", time: "8pm BST", home: "Croatia", away: "Ghana", group: "L" },
  { date: "Sat 27 Jun", time: "11pm BST", home: "Colombia", away: "Portugal", group: "K" },
  { date: "Sat 27 Jun", time: "11pm BST", home: "Congo DR", away: "Uzbekistan", group: "K" }
];

function getForm(name) {
  if (PROGRESSION.length < 2) return "same";
  const prev = PROGRESSION[PROGRESSION.length - 2][name] ?? 0;
  const curr = PROGRESSION[PROGRESSION.length - 1][name] ?? 0;
  return curr > prev ? "up" : curr < prev ? "down" : "same";
}

// All arrows same size, same glow — just different colours
function FormArrow({ name, size = 15 }) {
  const form = getForm(name);
  const colors = { up: "#40C6A0", down: "#E0556E", same: "#8694AC" };
  const symbols = { up: "↑", down: "↓", same: "→" };
  const col = colors[form];
  return (
    <span style={{
      fontSize: size, fontWeight: 800, marginLeft: 3,
      display: "inline-block", lineHeight: 1, color: col,
      textShadow: `0 0 6px ${col}, 0 0 12px ${col}88`,
    }}>{symbols[form]}</span>
  );
}

function Trophy() {
  const [glow, setGlow] = useState(false);
  useEffect(() => { const t = setInterval(() => setGlow(g => !g), 1200); return () => clearInterval(t); }, []);
  return <span style={{ fontSize: 24, filter: glow ? "drop-shadow(0 0 10px #F0C446) drop-shadow(0 0 20px #F0C446)" : "drop-shadow(0 0 3px #F0C44688)", transition: "filter 1.2s ease-in-out", marginRight: 4 }}>🏆</span>;
}

function OwnerBadge({ team }) {
  const owner = ownerOf(team);
  if (!owner) return null;
  const col = PLAYER_COLORS[owner] || "#666";
  return (
    <span style={{ background: col, color: NAVY, fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, flexShrink: 0, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
      {owner.toUpperCase()}
    </span>
  );
}

// Glowing points badge
function PtsBadge({ value, color }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 12, background: NAVY,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${color}`,
      boxShadow: `0 0 8px ${color}55, 0 0 16px ${color}22`,
    }}>
      <span style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

// ---------- Tab panel wrapper ----------
function TabPanel({ children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); return () => setVisible(false); }, []);
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.25s ease, transform 0.25s ease" }}>
      {children}
    </div>
  );
}

function getQualifyingCounts() {
  const counts = {};
  PLAYERS.forEach(p => { counts[p.name] = { q: 0, total: 0 }; });
  GROUPS.forEach(g => {
    const sorted = [...g.teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    sorted.forEach((t, i) => {
      const owner = ownerOf(t.name);
      if (owner && counts[owner]) { counts[owner].total++; if (i < 2) counts[owner].q++; }
    });
  });
  return counts;
}

const RankTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: NAVY2, border: `1px solid ${p.color}`, borderRadius: 12, padding: "12px 16px", maxWidth: 280, boxShadow: `0 0 16px ${p.color}44` }}>
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
    <div style={{ background: NAVY2, border: `1px solid ${GREEN}`, borderRadius: 12, padding: "12px 16px", boxShadow: `0 0 16px ${GREEN}33` }}>
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
    <div style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 16px", marginBottom: 10 }}>
      <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px", textShadow: `0 0 8px ${GREEN}88` }}>{group.name}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 30px 28px 28px 28px 32px", gap: 4, marginBottom: 6 }}>
        <span style={{ color: INK_SUB, fontSize: 9, letterSpacing: 1 }}>TEAM</span>
        {["GP","W","D","L","PTS"].map(h => <span key={h} style={{ color: INK_SUB, fontSize: 9, textAlign: "center", letterSpacing: 1 }}>{h}</span>)}
      </div>
      {sorted.map((t, i) => {
        const isTop2 = i < 2;
        const isConfirmed = CONFIRMED.has(t.name);
        const isEliminated = ELIMINATED.has(t.name);
        const rowBg = isConfirmed ? "rgba(64,198,160,0.10)" : isEliminated ? "rgba(224,85,110,0.10)" : "transparent";
        const leftBorder = isConfirmed ? "3px solid #40C6A0" : isEliminated ? "3px solid #E0556E" : "3px solid transparent";
        return (
          <div key={t.name}>
            {i === 2 && <div style={{ borderTop: "1px dashed rgba(255,255,255,0.25)", margin: "5px 0" }} />}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 30px 28px 28px 28px 32px", gap: 4, alignItems: "center", padding: "6px 4px", borderBottom: i < sorted.length - 1 && i !== 1 ? "1px solid rgba(255,255,255,0.04)" : "none", borderLeft: leftBorder, paddingLeft: 6, background: rowBg, borderRadius: 6, opacity: (!isConfirmed && !isEliminated && !isTop2) ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                {isTop2 && !isConfirmed && <div style={{ width: 3, height: 14, borderRadius: 2, background: GREEN, flexShrink: 0, boxShadow: `0 0 6px ${GREEN}` }} />}
                <span style={{ color: isConfirmed ? "#40C6A0" : isEliminated ? "#E0556E" : (isTop2 ? "#fff" : INK_SUB), fontSize: 12, fontWeight: isConfirmed || isEliminated || isTop2 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textShadow: isConfirmed ? "0 0 10px #40C6A0" : isEliminated ? "0 0 10px #E0556E" : "none" }}>{t.name}</span>
                {isConfirmed && <span style={{ background: "#40C6A0", color: "#0E1A2E", fontSize: 7, fontWeight: 900, padding: "1px 4px", borderRadius: 3, flexShrink: 0, boxShadow: "0 0 6px #40C6A0" }}>✓</span>}
                {isEliminated && <span style={{ background: "#E0556E", color: "#fff", fontSize: 7, fontWeight: 900, padding: "1px 4px", borderRadius: 3, flexShrink: 0, boxShadow: "0 0 6px #E0556E" }}>✗</span>}
                <OwnerBadge team={t.name} />
              </div>
              {[t.gp, t.w, t.d, t.l].map((v, j) => <span key={j} style={{ color: INK_SUB, fontSize: 11, textAlign: "center" }}>{v}</span>)}
              <span style={{ color: isConfirmed ? "#40C6A0" : isEliminated ? "#E0556E" : (isTop2 ? "#fff" : INK_SUB), fontSize: 12, fontWeight: 800, textAlign: "center", textShadow: isConfirmed ? "0 0 8px #40C6A0" : isEliminated ? "0 0 8px #E0556E" : "none" }}>{t.pts}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WinIndexTab() {
  const rows = computeWinIndex();
  const max = rows[0] ? rows[0].pct : 1;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.65 }}>
        Each player's overall chance of winning the sweepstake — a blend of <span style={{ color: "#B6C2D6" }}>50%</span> live World Cup title odds of your surviving teams, <span style={{ color: "#B6C2D6" }}>30%</span> current points, and <span style={{ color: "#B6C2D6" }}>20%</span> teams through to the last 32. All eight add up to 100%.
      </p>
      {rows.map((r, i) => (
        <div key={r.name} style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: INK_SUB, fontSize: 12, marginRight: 9 }}>{i + 1}</span>{r.name}
            </span>
            <span style={{ color: r.color, fontSize: 21, fontWeight: 900, textShadow: `0 0 12px ${r.color}55` }}>{r.pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${(r.pct / max) * 100}%`, height: "100%", background: r.color, borderRadius: 6, boxShadow: `0 0 10px ${r.color}88` }} />
          </div>
          <p style={{ color: INK_SUB, fontSize: 10.5, margin: "7px 0 0", letterSpacing: 0.3 }}>
            {r.titleEq.toFixed(1)} title odds · {r.points} pts · {r.through} through
          </p>
        </div>
      ))}
    </div>
  );
}

function TopTeams() {
  const all = GROUPS.flatMap(g => {
    const sorted = [...g.teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    return sorted.map((t, i) => ({ ...t, gd: t.gf - t.ga, qualifying: i < 2 }));
  });
  const sorted = [...all].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const splitIdx = sorted.findIndex(t => !t.qualifying);
  const qCounts = getQualifyingCounts();
  const playerSummary = [...PLAYERS].sort((a, b) => b.total - a.total);

  return (
    <div>
      <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px", textShadow: `0 0 8px ${GREEN}88` }}>Player Knockout Summary</p>
      <div style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 14px", marginBottom: 16 }}>
        {playerSummary.map((p, i) => {
          const q = qCounts[p.name] || { q: 0, total: 6 };
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < playerSummary.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0, boxShadow: `0 0 6px ${p.color}` }} />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, flex: 1 }}>{p.name}</span>
              <span style={{ color: INK_SUB, fontSize: 11, minWidth: 80, textAlign: "right" }}>{q.q}/{q.total} qualifying</span>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: q.total }).map((_, j) => (
                  <div key={j} style={{ width: 10, height: 10, borderRadius: 2, background: j < q.q ? p.color : "rgba(255,255,255,0.15)", boxShadow: j < q.q ? `0 0 4px ${p.color}` : "none" }} />
                ))}
              </div>
              <FormArrow name={p.name} size={15} />
            </div>
          );
        })}
      </div>

      <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 6px", textShadow: `0 0 8px ${GREEN}88` }}>All {sorted.length} Teams Ranked</p>
      <p style={{ color: INK_SUB, fontSize: 11, margin: "0 0 10px" }}>Points then goal difference. Dotted line = current elimination cut-off.</p>
      <div style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 28px", gap: 4, padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {["#","TEAM","PTS","GD","GF"].map(h => <span key={h} style={{ color: INK_SUB, fontSize: 9, fontWeight: 700, letterSpacing: 1, textAlign: h === "TEAM" ? "left" : "center" }}>{h}</span>)}
        </div>
        {sorted.map((t, i) => {
          const medal = i === 0 ? GOLD : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : null;
          const isConfirmed = CONFIRMED.has(t.name);
          const isEliminated = ELIMINATED.has(t.name);
          const rowBg = isConfirmed ? "rgba(64,198,160,0.12)" : isEliminated ? "rgba(224,85,110,0.12)" : i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent";
          const leftBorder = isConfirmed ? "3px solid #40C6A0" : isEliminated ? "3px solid #E0556E" : "3px solid transparent";
          return (
            <div key={t.name + i}>
              {i === splitIdx && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ flex: 1, borderTop: "1.5px dashed rgba(255,255,255,0.25)" }} />
                  <span style={{ color: INK_SUB, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>Elimination zone</span>
                  <div style={{ flex: 1, borderTop: "1.5px dashed rgba(255,255,255,0.25)" }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 28px", gap: 4, padding: "9px 14px", borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", borderLeft: leftBorder, alignItems: "center", background: rowBg, opacity: (!isConfirmed && !isEliminated && !t.qualifying) ? 0.5 : 1, boxShadow: isConfirmed ? "inset 0 0 20px rgba(64,198,160,0.06)" : isEliminated ? "inset 0 0 20px rgba(224,85,110,0.06)" : "none" }}>
                <span style={{ color: medal || (isConfirmed ? "#40C6A0" : isEliminated ? "#E0556E" : INK_SUB), fontSize: 11, fontWeight: 800, textAlign: "center", textShadow: isConfirmed ? "0 0 10px #40C6A0" : isEliminated ? "0 0 10px #E0556E" : medal ? `0 0 8px ${medal}` : "none" }}>{i + 1}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ color: isConfirmed ? "#40C6A0" : isEliminated ? "#E0556E" : "#fff", fontSize: 12, fontWeight: isConfirmed || isEliminated ? 800 : t.qualifying ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: isConfirmed ? "0 0 12px #40C6A0, 0 0 24px #40C6A066" : isEliminated ? "0 0 12px #E0556E, 0 0 24px #E0556E66" : "none" }}>{t.name}</span>
                  {isConfirmed && <span style={{ background: "#40C6A0", color: "#0E1A2E", fontSize: 8, fontWeight: 900, padding: "2px 5px", borderRadius: 4, flexShrink: 0, letterSpacing: 0.5, boxShadow: "0 0 8px #40C6A0" }}>✓ THROUGH</span>}
                  {isEliminated && <span style={{ background: "#E0556E", color: "#fff", fontSize: 8, fontWeight: 900, padding: "2px 5px", borderRadius: 4, flexShrink: 0, letterSpacing: 0.5, boxShadow: "0 0 8px #E0556E" }}>✗ OUT</span>}
                  <OwnerBadge team={t.name} />
                </div>
                <span style={{ color: isConfirmed ? "#40C6A0" : isEliminated ? "#E0556E" : "#fff", fontSize: 12, fontWeight: 800, textAlign: "center", textShadow: isConfirmed ? "0 0 8px #40C6A0" : isEliminated ? "0 0 8px #E0556E" : "0 0 8px rgba(255,255,255,0.3)" }}>{t.pts}</span>
                <span style={{ color: t.gd > 0 ? GREEN : t.gd < 0 ? "#E0556E" : INK_SUB, fontSize: 11, fontWeight: 600, textAlign: "center", textShadow: t.gd !== 0 ? `0 0 6px ${t.gd > 0 ? GREEN : "#E0556E"}88` : "none" }}>{t.gd > 0 ? `+${t.gd}` : t.gd}</span>
                <span style={{ color: INK_SUB, fontSize: 11, textAlign: "center" }}>{t.gf}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixturesTab() {
  const byDate = FIXTURES.reduce((acc, f) => { if (!acc[f.date]) acc[f.date] = []; acc[f.date].push(f); return acc; }, {});
  return (
    <div>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>All times UK (BST). Highlighted rows = your sweepstake teams playing.</p>
      {Object.entries(byDate).map(([date, games]) => (
        <div key={date} style={{ marginBottom: 16 }}>
          <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px", textShadow: `0 0 8px ${GREEN}88` }}>{date}</p>
          {games.map((g, i) => {
            const homeOwner = ownerOf(g.home);
            const awayOwner = ownerOf(g.away);
            const hasOwner = homeOwner || awayOwner;
            return (
              <div key={i} style={{ background: hasOwner ? "rgba(64,198,160,0.07)" : NAVY2, border: `1px solid ${hasOwner ? "rgba(64,198,160,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: hasOwner ? `0 0 12px rgba(64,198,160,0.08)` : "none" }}>
                <div style={{ flexShrink: 0, minWidth: 60 }}>
                  <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, margin: 0, textShadow: `0 0 8px ${GOLD}88` }}>{g.time}</p>
                  <p style={{ color: INK_SUB, fontSize: 10, margin: 0 }}>Grp {g.group}</p>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: homeOwner ? "#fff" : INK_SUB, fontSize: 13, fontWeight: homeOwner ? 700 : 400 }}>{g.home}</span>
                    {homeOwner && <OwnerBadge team={g.home} />}
                  </div>
                  <span style={{ color: INK_SUB, fontSize: 11 }}>vs</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: awayOwner ? "#fff" : INK_SUB, fontSize: 13, fontWeight: awayOwner ? 700 : 400 }}>{g.away}</span>
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

// Squad data: each player's 6 teams with flags (emoji) and current points
const SQUAD_DATA = [
  { name: "Lottie",  teams: [{ f:"🇲🇽", n:"Mexico", p:9 },{ f:"🇳🇱", n:"Netherlands", p:7 },{ f:"🇲🇦", n:"Morocco", p:7 },{ f:"🇦🇷", n:"Argentina", p:6 },{ f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", n:"England", p:4 },{ f:"🇵🇾", n:"Paraguay", p:4 }] },
  { name: "Tom",     teams: [{ f:"🇺🇸", n:"USA", p:6 },{ f:"🇧🇷", n:"Brazil", p:7 },{ f:"🇦🇺", n:"Australia", p:4 },{ f:"🇨🇮", n:"Ivory Coast", p:6 },{ f:"🇸🇦", n:"Saudi Arabia", p:1 },{ f:"🇧🇦", n:"Bosnia", p:4 }] },
  { name: "Joanne",  teams: [{ f:"🇩🇪", n:"Germany", p:6 },{ f:"🇨🇦", n:"Canada", p:4 },{ f:"🇨🇴", n:"Colombia", p:6 },{ f:"🇿🇦", n:"South Africa", p:4 },{ f:"🇨🇼", n:"Curaçao", p:1 },{ f:"🇹🇳", n:"Tunisia", p:0 }] },
  { name: "Sam",     teams: [{ f:"🇫🇷", n:"France", p:6 },{ f:"🇳🇴", n:"Norway", p:6 },{ f:"🇸🇪", n:"Sweden", p:4 },{ f:"🇪🇸", n:"Spain", p:4 },{ f:"🇺🇾", n:"Uruguay", p:2 },{ f:"🇺🇿", n:"Uzbekistan", p:0 }] },
  { name: "Joe",     teams: [{ f:"🇯🇵", n:"Japan", p:5 },{ f:"🇰🇷", n:"South Korea", p:3 },{ f:"🇧🇪", n:"Belgium", p:2 },{ f:"🇮🇷", n:"Iran", p:2 },{ f:"🇨🇩", n:"DR Congo", p:1 },{ f:"🇨🇿", n:"Czechia", p:1 }] },
  { name: "Darrell", teams: [{ f:"🇬🇭", n:"Ghana", p:4 },{ f:"🇨🇭", n:"Switzerland", p:7 },{ f:"🇵🇹", n:"Portugal", p:4 },{ f:"🇪🇨", n:"Ecuador", p:4 },{ f:"🇭🇹", n:"Haiti", p:0 },{ f:"🇵🇦", n:"Panama", p:0 }] },
  { name: "Matt",    teams: [{ f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", n:"Scotland", p:3 },{ f:"🇦🇹", n:"Austria", p:3 },{ f:"🇪🇬", n:"Egypt", p:4 },{ f:"🇸🇳", n:"Senegal", p:0 },{ f:"🇮🇶", n:"Iraq", p:0 },{ f:"🇩🇿", n:"Algeria", p:3 }] },
  { name: "Karina",  teams: [{ f:"🇳🇿", n:"New Zealand", p:1 },{ f:"🇨🇻", n:"Cape Verde", p:2 },{ f:"🇶🇦", n:"Qatar", p:1 },{ f:"🇹🇷", n:"Türkiye", p:3 },{ f:"🇯🇴", n:"Jordan", p:0 },{ f:"🇭🇷", n:"Croatia", p:3 }] },
];

function FlipCard({ player }) {
  const [flipped, setFlipped] = useState(false);
  const col = PLAYER_COLORS[player.name] || "#666";
  const total = player.teams.reduce((s, t) => s + t.p, 0);

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      style={{ cursor: "pointer", perspective: "1000px", height: flipped ? "auto" : 200, minHeight: 200 }}
    >
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        minHeight: 200,
      }}>
        {/* Front */}
        <div style={{
          position: flipped ? "absolute" : "relative", inset: 0, backfaceVisibility: "hidden",
          borderRadius: 16, background: `linear-gradient(135deg, ${col}22, ${col}08)`,
          border: `1.5px solid ${col}55`, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8, minHeight: 200,
          boxShadow: `0 0 20px ${col}22, inset 0 0 30px ${col}08`,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${col}88`, fontSize: 22, fontWeight: 900, color: "#0E1A2E" }}>
            {player.name[0]}
          </div>
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{player.name}</p>
          <p style={{ color: col, fontSize: 24, fontWeight: 900, margin: 0, textShadow: `0 0 12px ${col}` }}>{total} pts</p>
          <p style={{ color: INK_SUB, fontSize: 10, margin: 0, letterSpacing: 1 }}>TAP TO SEE SQUAD</p>
        </div>
        {/* Back */}
        <div style={{
          position: flipped ? "relative" : "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg)", borderRadius: 16,
          background: `linear-gradient(135deg, ${NAVY2}, ${NAVY})`,
          border: `1.5px solid ${col}55`, padding: "14px 16px",
          boxShadow: `0 0 20px ${col}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ color: col, fontSize: 13, fontWeight: 800, margin: 0, textShadow: `0 0 6px ${col}` }}>{player.name}'s Squad</p>
            <p style={{ color: GOLD, fontSize: 13, fontWeight: 800, margin: 0 }}>{total} pts</p>
          </div>
          {player.teams.slice().sort((a, b) => b.p - a.p).map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < player.teams.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{t.f}</span>
                <span style={{ color: CONFIRMED.has(t.n) ? "#40C6A0" : ELIMINATED.has(t.n) ? "#E0556E" : (t.p > 0 ? "#fff" : INK_SUB), fontSize: 13, fontWeight: t.p > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textShadow: CONFIRMED.has(t.n) ? "0 0 10px #40C6A0" : ELIMINATED.has(t.n) ? "0 0 10px #E0556E" : "none" }}>{t.n}</span>
                {CONFIRMED.has(t.n) && <span style={{ background: "#40C6A0", color: "#0E1A2E", fontSize: 7, fontWeight: 900, padding: "1px 4px", borderRadius: 3, flexShrink: 0, boxShadow: "0 0 6px #40C6A0" }}>✓</span>}
                {ELIMINATED.has(t.n) && <span style={{ background: "#E0556E", color: "#fff", fontSize: 7, fontWeight: 900, padding: "1px 4px", borderRadius: 3, flexShrink: 0, boxShadow: "0 0 6px #E0556E" }}>✗</span>}
              </div>
              <span style={{ color: t.p >= 3 ? col : t.p > 0 ? "#B6C2D6" : INK_SUB, fontSize: 13, fontWeight: 700, textShadow: t.p >= 3 ? `0 0 8px ${col}` : "none" }}>
                {t.p > 0 ? `+${t.p}` : "—"}
              </span>
            </div>
          ))}
          <p style={{ color: INK_SUB, fontSize: 10, textAlign: "center", margin: "10px 0 0", letterSpacing: 1 }}>TAP TO FLIP BACK</p>
        </div>
      </div>
    </div>
  );
}

function SquadsTab() {
  const orderedPlayers = [...SQUAD_DATA].sort((a, b) => {
    const pa = PLAYERS.find(p => p.name === a.name);
    const pb = PLAYERS.find(p => p.name === b.name);
    return (pb?.total || 0) - (pa?.total || 0);
  });
  return (
    <div>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 14px", lineHeight: 1.6 }}>Tap any card to flip and see a player's full squad and points. Sorted by current standings.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        {orderedPlayers.map(p => <FlipCard key={p.name} player={p} />)}
      </div>
    </div>
  );
}

export default function SweepstakeDashboard() {
  const [view, setView] = useState("standings");
  const ranked = [...PLAYERS].sort((a, b) => b.total - a.total);
  const leader = ranked[0];
  const integrityIssues = dataIntegrityIssues();
  const remaining = teamMap(t => Math.max(0, 3 - t.gp));
  const ptsLeftFor = (name) => Object.keys(OWNERS).filter(t => OWNERS[t] === name).reduce((s, t) => s + (remaining[t] || 0), 0) * 3;

  const tabs = [
    { id: "standings",   label: "Standings" },
    { id: "winindex",    label: "Win %" },
    { id: "progression", label: "Progress" },
    { id: "squads",      label: "Squads" },
    { id: "groups",      label: "Groups" },
    { id: "fixtures",    label: "Fixtures" },
    { id: "topteams",    label: "Top Teams" },
  ];

  return (
    <div style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`, minHeight: "100vh", fontFamily: "'Inter','Helvetica Neue',sans-serif", padding: "20px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>

        {integrityIssues.length > 0 && (
          <div style={{ background: "rgba(240,196,70,0.12)", border: "1px solid rgba(240,196,70,0.5)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
            <p style={{ color: GOLD, fontSize: 12, fontWeight: 800, margin: "0 0 4px", letterSpacing: 0.5 }}>⚠ Data check — standings don't reconcile</p>
            {integrityIssues.map((msg, i) => (
              <p key={i} style={{ color: "#E8D9A8", fontSize: 11.5, margin: "2px 0", lineHeight: 1.5 }}>{msg}</p>
            ))}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ color: GREEN, fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px", textShadow: `0 0 8px ${GREEN}88` }}>World Cup 2026</p>
            <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: -1, lineHeight: 1 }}>Sweepstake</h1>
            <p style={{ color: INK_SUB, fontSize: 12, margin: "6px 0 0" }}>Updated {LAST_UPDATED}</p>
          </div>
          <div style={{ textAlign: "right", background: "rgba(240,196,70,0.07)", border: "1px solid rgba(240,196,70,0.2)", borderRadius: 14, padding: "10px 14px", boxShadow: "0 0 20px rgba(240,196,70,0.1)" }}>
            <p style={{ color: GREEN, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 2px" }}>Leader</p>
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 900, margin: 0 }}><Trophy />{leader.name}</p>
            <p style={{ color: GOLD, fontSize: 15, fontWeight: 700, margin: 0, textShadow: `0 0 10px ${GOLD}` }}>{leader.total} pts</p>
          </div>
        </div>

        {/* Scrollable tabs with visible scroll hint below */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4, scrollbarWidth: "none" }}>
            <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setView(t.id)} style={{
                  padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                  background: view === t.id ? GREEN : "rgba(255,255,255,0.07)",
                  color: view === t.id ? NAVY : INK_SUB,
                  transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
                  boxShadow: view === t.id ? `0 0 16px ${GREEN}66` : "none",
                }}>{t.label}</button>
              ))}
            </div>
          </div>
          {/* Swipe hint row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, opacity: 0.6 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: INK_SUB, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>swipe for more tabs</span>
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 700 }}>›</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>
        </div>

        {/* Tab content with fade animation */}
        <TabPanel key={view}>
          {/* Charts */}
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

          {/* Player narrative commentary — progression tab only */}
          {view === "progression" && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 12px", textShadow: `0 0 8px ${GREEN}88` }}>Form Guide</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { name: "Lottie", emoji: "🔥", headline: "Out of sight", text: "Netherlands won Group F and Paraguay nicked a point, pushing Lottie to 37 and a nine-point lead. Mexico, Morocco and the Dutch are all through, Argentina are all but there, and even third-placed Paraguay should sneak into the last 32. This one is hers to lose." },
                  { name: "Tom",    emoji: "⚡", headline: "Clear in second", text: "Another strong night. Ivory Coast took second in Group E and Australia drew to grab second in Group D — a +4 round that lifts Tom to 28. With USA topping their group and Brazil already through, he has a stack of qualified teams and a firm grip on second." },
                  { name: "Sam",    emoji: "🥈", headline: "Quietly into third", text: "Sweden's draw with Japan nudged Sam to 22 and a lone third. France and Norway are safely through and meet tonight in the Group I decider, with Spain still to play. A low-drama campaign — now he needs his big names to fire when the knockouts arrive." },
                  { name: "Joanne", emoji: "📈", headline: "Stuck on 21", text: "A flat night that only confirmed the obvious: Germany are through as group winners, while Curaçao and Tunisia finished bottom and are out. Joanne holds on 21 — but with Germany, Colombia, Canada and South Africa all qualified, she has four teams in the last 32, more than anyone." },
                  { name: "Darrell",emoji: "🚀", headline: "Still surging", text: "Ecuador's stunning upset of Germany earned Darrell another three and lifted him to 19. Switzerland topped their group, with Portugal and Ghana still alive. Haiti and Panama are long gone, but his climb from rock bottom to the edge of the top four has been the story of the week." },
                  { name: "Joe",    emoji: "🤞", headline: "Inching up", text: "Japan's draw with Sweden sealed second in Group F and nudged Joe to 14, just ahead of Matt. Japan and third-placed South Korea are his live ones; Czechia are out. He needs his Group G pair, Belgium and Iran, to deliver tonight to keep climbing." },
                  { name: "Matt",   emoji: "😴", headline: "Left behind", text: "No games again for Matt's teams, so he slips to seventh on 13, now behind Joe. Scotland and Austria cling to third-place hopes, but Senegal, Iraq and Algeria have offered little. His Group I and J sides play tonight — it's now or never to climb off the floor." },
                  { name: "Karina", emoji: "🌱", headline: "A pulse", text: "Türkiye signed off with a shock 3-2 win over the USA — too late to save themselves, as they finished bottom and are out, but it earned Karina three points and lifted her into double figures at 10. Croatia and Cape Verde, both chasing third spots, are her last real hopes." },
                ].map((p, i) => {
                  const player = PLAYERS.find(pl => pl.name === p.name);
                  const col = player?.color || "#666";
                  return (
                    <div key={p.name} style={{ background: NAVY2, border: `1px solid ${col}33`, borderLeft: `3px solid ${col}`, borderRadius: 12, padding: "12px 14px", boxShadow: `0 0 12px ${col}11` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 16 }}>{p.emoji}</span>
                        <span style={{ color: col, fontSize: 13, fontWeight: 800, textShadow: `0 0 6px ${col}88` }}>{p.name}</span>
                        <span style={{ color: col, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>— {p.headline}</span>
                      </div>
                      <p style={{ color: "#B6C2D6", fontSize: 12.5, margin: 0, lineHeight: 1.65 }}>{p.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standings list */}
          {view === "standings" && (
            <>
              <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                <span style={{ color: "#40C6A0", fontSize: 11, fontWeight: 700, textShadow: "0 0 6px #40C6A088" }}>● Confirmed through</span>
                <span style={{ color: "#E0556E", fontSize: 11, fontWeight: 700, textShadow: "0 0 6px #E0556E88" }}>● Eliminated</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 8, marginBottom: 16 }}>
                {ranked.map((p, i) => {
                  const medal = ["#F0C446","#C0C0C0","#CD7F32"][i];
                  return (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 12px", borderBottom: i < ranked.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: medal || "rgba(255,255,255,0.08)", color: medal ? NAVY : INK_SUB, fontWeight: 800, fontSize: 13, marginTop: 2, boxShadow: medal ? `0 0 10px ${medal}88` : "none" }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 3px" }}>{p.name}</p>
                        <p style={{ color: INK_SUB, fontSize: 11.5, margin: 0, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
                      <TeamsText text={p.teams} baseColor={INK_SUB} />
                    </p>
                        <p style={{ color: GREEN, fontSize: 10.5, margin: "5px 0 0", fontWeight: 600, opacity: 0.9 }}>
                          {i === 0
                            ? `Leads by ${p.total - ranked[1].total} · ${ptsLeftFor(p.name)} pts still to play`
                            : (ranked[i - 1].total - p.total === 0
                                ? `Level with ${ranked[i - 1].name} · ${ptsLeftFor(p.name)} pts still to play`
                                : `${ranked[i - 1].total - p.total} behind ${ranked[i - 1].name} · ${ptsLeftFor(p.name)} pts still to play`)}
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <PtsBadge value={p.total} color={p.color} />
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ color: INK_SUB, fontSize: 9 }}>PL {p.played}</span>
                          <FormArrow name={p.name} size={15} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px", textShadow: `0 0 8px ${GREEN}88` }}>Latest results</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
                {RECENT.map((m, i) => {
                  const wa = m.ga > m.gb, wb = m.gb > m.ga;
                  const winnerGlow = wa ? "rgba(64,198,160,0.12)" : wb ? "rgba(64,198,160,0.12)" : "transparent";
                  return (
                    <div key={i} style={{ background: NAVY2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px", textAlign: "center", boxShadow: `inset 0 0 20px ${winnerGlow}` }}>
                      <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>
                        <span style={{ color: wa ? "#fff" : INK_SUB, textShadow: wa ? "0 0 10px rgba(255,255,255,0.4)" : "none" }}>{m.ga}</span>
                        <span style={{ color: INK_SUB, margin: "0 6px" }}>–</span>
                        <span style={{ color: wb ? "#fff" : INK_SUB, textShadow: wb ? "0 0 10px rgba(255,255,255,0.4)" : "none" }}>{m.gb}</span>
                      </p>
                      <p style={{ color: "#B6C2D6", fontSize: 11.5, margin: 0 }}>{m.a} v {m.b}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {view === "groups" && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>Top 2 advance automatically. Best 8 third-placed also qualify. Green bar = qualifying. Dotted line = elimination cut-off.</p>
              {GROUPS.map(g => <GroupCard key={g.name} group={g} />)}
            </div>
          )}

          {view === "fixtures" && <FixturesTab />}
          {view === "winindex" && <WinIndexTab />}
          {view === "topteams" && <TopTeams />}
          {view === "squads" && <SquadsTab />}
        </TabPanel>

        {/* Scoring key */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          {[["WIN", 3, GREEN], ["DRAW", 1, "#5896FF"], ["LOSS", 0, INK_SUB]].map(([l, n, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, border: `1.5px solid ${c}`, borderRadius: 20, padding: "5px 14px", boxShadow: `0 0 8px ${c}33` }}>
              <span style={{ color: "#D2DAE6", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{l}</span>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: c, color: NAVY, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px ${c}88` }}>{n}</span>
            </div>
          ))}
        </div>
        <p style={{ color: "#3D4A5E", fontSize: 10, textAlign: "center", marginTop: 16 }}>World Cup 2026 Sweepstake · Win 3 · Draw 1 · Loss 0</p>
      </div>
    </div>
  );
}
