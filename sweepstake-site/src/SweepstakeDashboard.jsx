import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { PLAYERS, PROGRESSION, RECENT, LAST_UPDATED } from "./data.js";
import { GROUPS, OWNERS, PLAYER_COLORS, STRENGTH } from "./groups.js";

const NAVY = "#060B16";
const NAVY2 = "#101E38";
const GOLD = "#FFD23F";
const GREEN = "#1DF0A5";
const INK_SUB = "#8FA2C0";
const MAGENTA = "#FF2E88";
const CYAN = "#22E0F0";
const VIOLET = "#9B6BFF";

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
  // Once every group is complete, settle the third-place race: the 8 best third-placed
  // teams join the knockouts; the other 4 are out (even though they finished 3rd).
  if (GROUPS.every(g => g.teams.every(t => t.gp >= 3))) {
    const thirds = GROUPS.map(g => [...g.teams].sort(rank)[2]).sort(rank);
    thirds.forEach((t, i) => (i < 8 ? confirmed : eliminated).add(t.name));
  }
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
  const titleEq = {}, alive = {};
  const koOut = koLosers();
  PLAYERS.forEach(p => { titleEq[p.name] = 0; alive[p.name] = 0; });
  GROUPS.forEach(g => g.teams.forEach(t => {
    const owner = ownerOf(t.name);
    if (!owner) return;
    const dead = ELIMINATED.has(t.name) || koOut.has(t.name);
    if (!dead) { titleEq[owner] += (STRENGTH[t.name] || 0); alive[owner] += 1; }
  }));
  const total = obj => Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const sT = total(titleEq), sA = total(alive);
  const W_TITLE = 0.65, W_ALIVE = 0.35;
  return PLAYERS.map(p => {
    const share = W_TITLE * (titleEq[p.name] / sT) + W_ALIVE * (alive[p.name] / sA);
    return { name: p.name, color: p.color, pct: share * 100, titleEq: titleEq[p.name], alive: alive[p.name] };
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
  { date: "Sun 28 Jun", time: "8pm BST",   home: "South Africa", away: "Canada", group: "R32" },
  { date: "Mon 29 Jun", time: "6pm BST",   home: "Brazil", away: "Japan", group: "R32" },
  { date: "Mon 29 Jun", time: "9:30pm BST",home: "Germany", away: "Paraguay", group: "R32" },
  { date: "Tue 30 Jun", time: "12am BST",  home: "Netherlands", away: "Morocco", group: "R32" },
  { date: "Tue 30 Jun", time: "6pm BST",   home: "Ivory Coast", away: "Norway", group: "R32" },
  { date: "Tue 30 Jun", time: "10pm BST",  home: "France", away: "Sweden", group: "R32" },
  { date: "Wed 1 Jul",  time: "12am BST",  home: "Mexico", away: "Ecuador", group: "R32" },
  { date: "Wed 1 Jul",  time: "5pm BST",   home: "England", away: "DR Congo", group: "R32" },
  { date: "Wed 1 Jul",  time: "9pm BST",   home: "Belgium", away: "Senegal", group: "R32" },
  { date: "Thu 2 Jul",  time: "1am BST",   home: "USA", away: "Bosnia", group: "R32" },
  { date: "Thu 2 Jul",  time: "8pm BST",   home: "Spain", away: "Austria", group: "R32" },
  { date: "Fri 3 Jul",  time: "12am BST",  home: "Portugal", away: "Croatia", group: "R32" },
  { date: "Fri 3 Jul",  time: "4am BST",   home: "Switzerland", away: "Algeria", group: "R32" },
  { date: "Fri 3 Jul",  time: "7pm BST",   home: "Australia", away: "Egypt", group: "R32" },
  { date: "Fri 3 Jul",  time: "11pm BST",  home: "Argentina", away: "Cape Verde", group: "R32" },
  { date: "Sat 4 Jul",  time: "2:30am BST",home: "Colombia", away: "Ghana", group: "R32" }
];

// ---------- Full knockout bracket (official FIFA match numbers 73–104) ----------
// Slot codes: "1X"/"2X" = group winner/runner-up, a bare team name = an assigned best-3rd,
// "W##" = winner of match ##. Matches are listed top-to-bottom in true bracket order so the
// columns line up into a tree. KO_RESULTS holds knockout scores as they're played:
//   KO_RESULTS[73] = { as: 2, bs: 1 }            → winner is side A
//   KO_RESULTS[73] = { as: 1, bs: 1, pens: "b" } → draw, side B wins on penalties
// Add to it each update and every later round advances automatically.
const KO = {
  R32: [
    { m:74, date:"Mon 29 Jun", time:"9:30pm", venue:"Boston",       a:"1E", b:"Paraguay" },
    { m:77, date:"Tue 30 Jun", time:"10pm",   venue:"New Jersey",   a:"1I", b:"Sweden" },
    { m:73, date:"Sun 28 Jun", time:"8pm",    venue:"Los Angeles",  a:"2A", b:"2B" },
    { m:75, date:"Tue 30 Jun", time:"12am",   venue:"Monterrey",    a:"1F", b:"2C" },
    { m:83, date:"Thu 2 Jul",  time:"8pm",    venue:"Los Angeles",  a:"1H", b:"2J" },
    { m:84, date:"Fri 3 Jul",  time:"4am",    venue:"Vancouver",    a:"1B", b:"Algeria" },
    { m:81, date:"Thu 2 Jul",  time:"1am",    venue:"Santa Clara",  a:"1D", b:"Bosnia-Herzegovina" },
    { m:82, date:"Wed 1 Jul",  time:"9pm",    venue:"Seattle",      a:"1G", b:"Senegal" },
    { m:76, date:"Mon 29 Jun", time:"6pm",    venue:"Houston",      a:"1C", b:"2F" },
    { m:78, date:"Tue 30 Jun", time:"6pm",    venue:"Dallas",       a:"2E", b:"2I" },
    { m:79, date:"Wed 1 Jul",  time:"12am",   venue:"Mexico City",  a:"1A", b:"Ecuador" },
    { m:80, date:"Wed 1 Jul",  time:"5pm",    venue:"Atlanta",      a:"1L", b:"Congo DR" },
    { m:86, date:"Fri 3 Jul",  time:"11pm",   venue:"Miami",        a:"1J", b:"2H" },
    { m:88, date:"Fri 3 Jul",  time:"7pm",    venue:"Dallas",       a:"2D", b:"2G" },
    { m:85, date:"Thu 2 Jul",  time:"12am",   venue:"Philadelphia", a:"2K", b:"2L" },
    { m:87, date:"Sat 4 Jul",  time:"2:30am", venue:"Kansas City",  a:"1K", b:"Ghana" },
  ],
  R16: [
    { m:89, date:"Sat 4 Jul",  time:"10pm", venue:"Philadelphia", a:"W74", b:"W77" },
    { m:90, date:"Sat 4 Jul",  time:"6pm",  venue:"Houston",      a:"W73", b:"W75" },
    { m:93, date:"Sat 4 Jul",  time:"8pm",  venue:"Dallas",       a:"W83", b:"W84" },
    { m:94, date:"Sun 5 Jul",  time:"1am",  venue:"Seattle",      a:"W81", b:"W82" },
    { m:91, date:"Sun 5 Jul",  time:"9pm",  venue:"New Jersey",   a:"W76", b:"W78" },
    { m:92, date:"Mon 6 Jul",  time:"1am",  venue:"Mexico City",  a:"W79", b:"W80" },
    { m:95, date:"Sun 5 Jul",  time:"5pm",  venue:"Atlanta",      a:"W86", b:"W88" },
    { m:96, date:"Sun 5 Jul",  time:"9pm",  venue:"Vancouver",    a:"W85", b:"W87" },
  ],
  QF: [
    { m:97,  date:"Thu 9 Jul",  time:"9pm", venue:"Boston",      a:"W89", b:"W90" },
    { m:98,  date:"Fri 10 Jul", time:"8pm", venue:"Los Angeles", a:"W93", b:"W94" },
    { m:99,  date:"Sat 11 Jul", time:"10pm",venue:"Miami",       a:"W91", b:"W92" },
    { m:100, date:"Sun 12 Jul", time:"2am", venue:"Kansas City", a:"W95", b:"W96" },
  ],
  SF: [
    { m:101, date:"Tue 14 Jul", time:"8pm", venue:"Dallas",   a:"W97", b:"W98" },
    { m:102, date:"Wed 15 Jul", time:"8pm", venue:"Atlanta",  a:"W99", b:"W100" },
  ],
  Final: [
    { m:104, date:"Sun 19 Jul", time:"8pm", venue:"New Jersey", a:"W101", b:"W102" },
  ],
};

const KO_RESULTS = {
  73: { as: 0, bs: 1 }, // South Africa 0–1 Canada (R32) — Eustáquio 90+2'
  76: { as: 2, bs: 1 }, // Brazil 2–1 Japan (R32) — Martinelli late winner
  74: { as: 1, bs: 1, pens: "b" }, // Germany 1–1 Paraguay (R32) — Paraguay win 4–3 pens
  75: { as: 1, bs: 1, pens: "b" }, // Netherlands 1–1 Morocco (R32) — Morocco win 3–2 pens
  77: { as: 3, bs: 0 }, // France 3–0 Sweden (R32) — Mbappé brace (all-Sam tie)
  78: { as: 1, bs: 2 }, // Ivory Coast 1–2 Norway (R32) — Haaland winner
  79: { as: 2, bs: 0 }, // Mexico 2–0 Ecuador (R32)
};

function rankTeams(a, b) {
  return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
}

// Resolve a bracket slot code to an actual team (if known) plus a fallback label.
function resolveSlot(code) {
  if (code.startsWith("3:")) return { team: null, label: "3rd " + code.slice(2) };
  if (GROUPS.some(g => g.teams.some(t => t.name === code))) return { team: code, label: code };
  const pos = code[0], gl = code.slice(1);
  const label = (pos === "1" ? "Winner " : "Runner-up ") + gl;
  const g = GROUPS.find(x => x.name === "Group " + gl);
  if (!g || !g.teams.every(t => t.gp >= 3)) return { team: null, label };
  const sorted = [...g.teams].sort(rankTeams);
  return { team: (pos === "1" ? sorted[0] : sorted[1]).name, label };
}

// Find a knockout match object by its number, across all rounds.
function koMatch(num) {
  for (const round of Object.values(KO)) {
    const f = round.find(x => x.m === num);
    if (f) return f;
  }
  return null;
}

// The winning team of a knockout match, if it's been played (else null).
function koWinner(num) {
  const res = KO_RESULTS[num];
  const match = koMatch(num);
  if (!res || !match) return null;
  const a = resolveTeam(match.a).team, b = resolveTeam(match.b).team;
  if (!a || !b) return null;
  if (res.as > res.bs) return a;
  if (res.bs > res.as) return b;
  return res.pens === "a" ? a : res.pens === "b" ? b : null;
}

// Resolve any bracket slot — group codes, assigned thirds, or "W##" winner references.
function resolveTeam(slot) {
  if (typeof slot === "string" && slot[0] === "W" && /^\d+$/.test(slot.slice(1))) {
    const num = parseInt(slot.slice(1), 10);
    const w = koWinner(num);
    return w ? { team: w, label: w } : { team: null, label: "Winner " + num };
  }
  return resolveSlot(slot);
}

// Teams knocked out in the bracket so far (losers of every played knockout match).
function koLosers() {
  const out = new Set();
  for (const m in KO_RESULTS) {
    const match = koMatch(+m), w = koWinner(+m);
    if (!match || !w) continue;
    const a = resolveTeam(match.a).team, b = resolveTeam(match.b).team;
    if (a && a !== w) out.add(a);
    if (b && b !== w) out.add(b);
  }
  return out;
}

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

// One team line inside a bracket card.
function BracketSlot({ slot, matchNum, side, top }) {
  const { team, label } = resolveTeam(slot);
  const res = KO_RESULTS[matchNum];
  const owner = team ? ownerOf(team) : null;
  const col = (owner && PLAYER_COLORS[owner]) || "#46566F";
  const score = res ? (side === "a" ? res.as : res.bs) : null;
  const winner = res ? koWinner(matchNum) : null;
  const isWinner = winner && team === winner;
  const isLoser = res && team && !isWinner;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, height: 23, padding: "0 7px",
      borderTop: top ? "none" : "1px solid rgba(255,255,255,0.06)",
      borderLeft: `3px solid ${team ? col : "transparent"}`,
      background: isWinner ? `${col}1c` : "transparent",
      opacity: isLoser ? 0.38 : 1,
    }}>
      {team && <span style={{ fontSize: 12, flexShrink: 0, filter: isLoser ? "grayscale(1)" : "none" }}>{flagFor(team)}</span>}
      <span style={{
        flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        color: team ? "#fff" : "#566679", fontSize: 11.5, fontWeight: isWinner ? 900 : team ? 600 : 400,
        fontStyle: team ? "normal" : "italic",
      }}>{team || label}</span>
      {owner && <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: `0 0 6px ${col}` }} />}
      {score != null && <span style={{ color: isWinner ? GOLD : INK_SUB, fontSize: 12, fontWeight: 900, minWidth: 9, textAlign: "right" }}>{score}</span>}
    </div>
  );
}

function BracketCard({ match, accent }) {
  return (
    <div style={{
      width: "100%", background: `linear-gradient(180deg, ${NAVY2}, #0a1424)`, borderRadius: 9, overflow: "hidden",
      border: `1px solid ${accent ? GOLD + "88" : "rgba(255,255,255,0.11)"}`,
      boxShadow: accent ? `0 0 22px ${GOLD}55` : "0 3px 12px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 7px", background: "rgba(255,255,255,0.035)" }}>
        <span style={{ color: accent ? GOLD : GREEN, fontSize: 8, fontWeight: 900, letterSpacing: 0.5 }}>M{match.m}</span>
        <span style={{ color: "#46566F", fontSize: 8, fontWeight: 600 }}>{match.date} · {match.time}</span>
      </div>
      <BracketSlot slot={match.a} matchNum={match.m} side="a" top />
      <BracketSlot slot={match.b} matchNum={match.m} side="b" />
    </div>
  );
}

function TreeBracket() {
  const rounds = [
    { key: "R32",   label: "Round of 32",    matches: KO.R32 },
    { key: "R16",   label: "Round of 16",    matches: KO.R16 },
    { key: "QF",    label: "Quarter-finals", matches: KO.QF },
    { key: "SF",    label: "Semi-finals",    matches: KO.SF },
    { key: "Final", label: "Final",          matches: KO.Final },
  ];
  const BASE = 80, GAP = 20;
  const TREE_H = KO.R32.length * BASE;
  const COL_W = { R32: 172, R16: 162, QF: 162, SF: 162, Final: 176 };
  const line = `${GREEN}66`, lineSh = `0 0 6px ${GREEN}66`;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 4px", lineHeight: 1.6 }}>
        The road to the final. Swipe sideways to follow each path — every team carries its owner's colour, and scores fill in as the knockouts play out.
      </p>
      <p style={{ color: GREEN, fontSize: 10.5, fontWeight: 700, margin: "0 0 12px", letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>‹ swipe across the bracket ›</p>
      <div style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", paddingBottom: 12 }}>
        <div style={{ minWidth: "max-content" }}>
          <div style={{ display: "flex", gap: GAP, marginBottom: 8 }}>
            {rounds.map(r => (
              <div key={r.key} style={{
                width: COL_W[r.key], flexShrink: 0, textAlign: "center", padding: "6px 0", borderRadius: 8,
                background: r.key === "Final" ? `linear-gradient(90deg, ${GOLD}2a, ${GOLD}10)` : `linear-gradient(90deg, ${GREEN}22, ${GREEN}0a)`,
                color: r.key === "Final" ? GOLD : GREEN, fontSize: 10.5, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase",
                border: `1px solid ${r.key === "Final" ? GOLD + "66" : GREEN + "44"}`, boxShadow: `0 0 16px ${(r.key === "Final" ? GOLD : GREEN)}26`,
              }}>{r.key === "Final" ? "🏆 Final" : r.label}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: GAP, height: TREE_H }}>
            {rounds.map((r, ri) => {
              const cellH = BASE * Math.pow(2, ri);
              const notLast = ri < rounds.length - 1;
              return (
                <div key={r.key} style={{ width: COL_W[r.key], flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  {r.matches.map((match, idx) => {
                    const topCell = idx % 2 === 0;
                    return (
                      <div key={match.m} style={{ height: cellH, position: "relative", display: "flex", alignItems: "center" }}>
                        <BracketCard match={match} accent={r.key === "Final"} />
                        {notLast && (
                          <>
                            <div style={{ position: "absolute", left: "100%", top: "calc(50% - 1px)", width: GAP / 2, height: 2, background: line, boxShadow: lineSh }} />
                            <div style={{ position: "absolute", left: `calc(100% + ${GAP / 2 - 1}px)`, top: topCell ? "50%" : 0, height: "50%", width: 2, background: line, boxShadow: lineSh }} />
                            {topCell && <div style={{ position: "absolute", left: `calc(100% + ${GAP / 2}px)`, top: "calc(100% - 1px)", width: GAP / 2, height: 2, background: line, boxShadow: lineSh }} />}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Radial "circle draw" — all 32 teams ringed around the trophy, lines converging inward.
function CircleBracket() {
  const C = 500, VB = 1000;
  const R = [442, 350, 264, 184, 110];       // ring radii, outer→in
  const NR = [42, 35, 31, 27, 25];           // node radii per ring
  const koOut = koLosers();
  const isOut = name => name && (ELIMINATED.has(name) || koOut.has(name));

  // Outer 32 teams in true bracket order (pairs adjacent).
  const outer = [];
  KO.R32.forEach(m => { outer.push(resolveTeam(m.a).team); outer.push(resolveTeam(m.b).team); });
  const ang0 = outer.map((_, p) => -90 + p * (360 / 32));
  const avg = (arr, n) => Array.from({ length: n }, (_, i) => (arr[2 * i] + arr[2 * i + 1]) / 2);
  const ang1 = avg(ang0, 16), ang2 = avg(ang1, 8), ang3 = avg(ang2, 4), ang4 = avg(ang3, 2);
  const pos = (rad, deg) => { const a = deg * Math.PI / 180; return [C + rad * Math.cos(a), C + rad * Math.sin(a)]; };

  // Winners per inner ring (by match number, in bracket order).
  const w1 = KO.R32.map(m => koWinner(m.m));
  const w2 = KO.R16.map(m => koWinner(m.m));
  const w3 = KO.QF.map(m => koWinner(m.m));
  const w4 = KO.SF.map(m => koWinner(m.m));
  const champ = koWinner(KO.Final[0].m);

  const rings = [
    { teams: outer, ang: ang0, r: R[0], nr: NR[0] },
    { teams: w1, ang: ang1, r: R[1], nr: NR[1] },
    { teams: w2, ang: ang2, r: R[2], nr: NR[2] },
    { teams: w3, ang: ang3, r: R[3], nr: NR[3] },
    { teams: w4, ang: ang4, r: R[4], nr: NR[4] },
  ];

  // Connector lines: each node to its parent (next ring in).
  const lines = [];
  for (let lvl = 0; lvl < 4; lvl++) {
    const child = rings[lvl], parent = rings[lvl + 1];
    child.teams.forEach((t, i) => {
      const [cx, cy] = pos(child.r, child.ang[i]);
      const [px, py] = pos(parent.r, parent.ang[i >> 1]);
      const advanced = t && parent.teams[i >> 1] === t;
      lines.push({ cx, cy, px, py, advanced });
    });
  }
  // SF → centre
  rings[4].teams.forEach((t, i) => {
    const [cx, cy] = pos(R[4], ang4[i]);
    lines.push({ cx, cy, px: C, py: C, advanced: t && champ === t });
  });

  const node = (team, x, y, r, key) => {
    const owner = team ? ownerOf(team) : null;
    const col = owner ? PLAYER_COLORS[owner] : "#33475f";
    const out = isOut(team);
    return (
      <foreignObject key={key} x={x - r} y={y - r} width={2 * r} height={2 * r} style={{ overflow: "visible" }}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          width: "100%", height: "100%", borderRadius: "50%", boxSizing: "border-box",
          border: `3px solid ${col}`, boxShadow: out ? "none" : `0 0 9px ${col}`,
          display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1424",
          fontSize: r * 1.15, lineHeight: 1, filter: out ? "grayscale(1)" : "none", opacity: out ? 0.4 : 1,
        }}>{team ? flagFor(team) : ""}</div>
      </foreignObject>
    );
  };

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" style={{ display: "block" }}>
      <defs>
        <radialGradient id="cbGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.25" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={300} fill="url(#cbGlow)" />
      {lines.map((l, i) => (
        <line key={i} x1={l.cx} y1={l.cy} x2={l.px} y2={l.py}
          stroke={l.advanced ? GOLD : GREEN} strokeWidth={l.advanced ? 3 : 1.4}
          strokeOpacity={l.advanced ? 0.95 : 0.3} strokeLinecap="round" />
      ))}
      {rings.flatMap((ring, lvl) => ring.teams.map((t, i) => {
        const [x, y] = pos(ring.r, ring.ang[i]);
        return node(t, x, y, ring.nr, `${lvl}-${i}`);
      }))}
      {/* centre: champion flag if decided, else trophy */}
      {champ ? node(champ, C, C, 34, "champ") : (
        <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fontSize="64" style={{ filter: `drop-shadow(0 0 14px ${GOLD})` }}>🏆</text>
      )}
    </svg>
  );
}

function CompactField() {
  const winIdx = computeWinIndex();
  const maxPct = Math.max(...winIdx.map(r => r.pct)) || 1;
  const medal = ["#FFD23F", "#C8D2E0", "#E08A4B"];
  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ color: GREEN, fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px", textShadow: `0 0 10px ${GREEN}` }}>The Field</p>
      <p style={{ color: INK_SUB, fontSize: 10.5, margin: "0 0 10px" }}>Ranked by Win % · flags grey out as teams go out</p>
      {winIdx.map((r, i) => {
        const p = PLAYERS.find(x => x.name === r.name);
        const squad = SQUAD_DATA.find(s => s.name === r.name);
        const teams = squad ? squad.teams : [];
        const aliveN = teams.filter(t => teamAlive(t.n)).length;
        return (
          <div key={r.name} style={{
            background: `linear-gradient(135deg, ${p.color}16, ${NAVY2} 62%)`,
            border: `1px solid ${p.color}33`, borderLeft: `3px solid ${p.color}`, borderRadius: 11,
            padding: "8px 11px", marginBottom: 7, animation: "wcFade 0.35s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 19, height: 19, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: medal[i] || "rgba(255,255,255,0.08)", color: medal[i] ? NAVY : INK_SUB, fontWeight: 900, fontSize: 10.5, boxShadow: medal[i] ? `0 0 8px ${medal[i]}88` : "none" }}>{i + 1}</span>
              <span style={{ color: p.color, fontSize: 13.5, fontWeight: 900, flex: 1, textShadow: `0 0 7px ${p.color}88`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
              <span style={{ display: "flex", gap: 3, alignItems: "center", marginRight: 4 }}>
                {teams.map(t => {
                  const live = teamAlive(t.n);
                  return <span key={t.n} style={{ fontSize: 13, filter: live ? "none" : "grayscale(1)", opacity: live ? 1 : 0.35 }}>{t.f}</span>;
                })}
              </span>
              <span style={{ color: "#fff", fontSize: 11.5, fontWeight: 800, minWidth: 26, textAlign: "right" }}>{aliveN}<span style={{ color: INK_SUB, fontSize: 9.5, fontWeight: 600 }}>/6</span></span>
              <span style={{ color: GOLD, fontSize: 12.5, fontWeight: 900, minWidth: 44, textAlign: "right", textShadow: `0 0 7px ${GOLD}66` }}>{r.pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 6 }}>
              <div style={{ width: `${(r.pct / maxPct) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${p.color}, ${GOLD})`, boxShadow: `0 0 8px ${p.color}88` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketTab() {
  const [mode, setMode] = useState("circle");
  const Toggle = ({ id, label }) => {
    const active = mode === id;
    return (
      <button onClick={() => setMode(id)} style={{
        flex: 1, padding: "9px 8px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
        background: active ? `linear-gradient(135deg, ${GREEN}, ${CYAN})` : "rgba(255,255,255,0.05)",
        color: active ? NAVY : INK_SUB, border: `1px solid ${active ? GREEN : "rgba(255,255,255,0.08)"}`,
        boxShadow: active ? `0 0 16px ${GREEN}55` : "none",
      }}>{label}</button>
    );
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Toggle id="circle" label="◎ Circle" />
        <Toggle id="tree" label="⊟ Tree" />
      </div>
      {mode === "circle" ? (
        <>
          <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>
            All 32, ringed around the trophy. Each flag carries its owner's colour; knocked-out teams grey out and winning paths light up gold as they advance toward the centre.
          </p>
          <CircleBracket />
        </>
      ) : <TreeBracket />}
      <CompactField />
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
  const MONTHS = { Jun: 6, Jul: 7 };
  const dateKey = m => {
    const p = m.date.split(" "); const day = +p[1], mon = MONTHS[p[2]] || 7;
    const tm = (m.time || "").match(/(\d+)(?::(\d+))?(am|pm)/i);
    let hr = tm ? +tm[1] : 0; const min = tm && tm[2] ? +tm[2] : 0; const pm = tm && /pm/i.test(tm[3]);
    if (pm && hr !== 12) hr += 12; if (!pm && hr === 12) hr = 0;
    return (mon * 100 + day) * 10000 + hr * 100 + min;
  };
  const rounds = [
    { key: "R32", label: "Round of 32", matches: KO.R32 },
    { key: "R16", label: "Round of 16", matches: KO.R16 },
    { key: "QF", label: "Quarter-finals", matches: KO.QF },
    { key: "SF", label: "Semi-finals", matches: KO.SF },
    { key: "Final", label: "Final", matches: KO.Final },
  ];
  const Side = ({ slot, matchNum, side }) => {
    const { team, label } = resolveTeam(slot);
    const res = KO_RESULTS[matchNum];
    const owner = team ? ownerOf(team) : null;
    const col = owner ? PLAYER_COLORS[owner] : null;
    const win = res ? koWinner(matchNum) : null;
    const isWin = win && team === win, isLoss = res && team && !isWin;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, justifyContent: side === "a" ? "flex-end" : "flex-start", opacity: isLoss ? 0.45 : 1, minWidth: 0 }}>
        {side === "b" && team && <span style={{ fontSize: 15 }}>{flagFor(team)}</span>}
        <span style={{ color: team ? "#fff" : "#5C6B82", fontSize: 12.5, fontWeight: isWin ? 900 : team ? 600 : 400, fontStyle: team ? "normal" : "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team || label}</span>
        {col && <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: `0 0 5px ${col}` }} />}
        {side === "a" && team && <span style={{ fontSize: 15 }}>{flagFor(team)}</span>}
      </div>
    );
  };
  return (
    <div>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 14px", lineHeight: 1.6 }}>All times UK (BST). Owner-coloured dots mark sweepstake teams; finished games show the score.</p>
      {rounds.map(r => {
        const ms = [...r.matches].sort((a, b) => dateKey(a) - dateKey(b));
        return (
          <div key={r.key} style={{ marginBottom: 18 }}>
            <p style={{ color: r.key === "Final" ? GOLD : GREEN, fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px", textShadow: `0 0 8px ${(r.key === "Final" ? GOLD : GREEN)}88` }}>{r.key === "Final" ? "🏆 Final" : r.label}</p>
            {ms.map(m => {
              const res = KO_RESULTS[m.m];
              const owned = [resolveTeam(m.a).team, resolveTeam(m.b).team].some(t => t && ownerOf(t));
              const win = res ? koWinner(m.m) : null;
              const winA = win && resolveTeam(m.a).team === win;
              return (
                <div key={m.m} style={{ background: owned ? "rgba(29,240,165,0.06)" : NAVY2, border: `1px solid ${owned ? "rgba(29,240,165,0.22)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "9px 12px", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Side slot={m.a} matchNum={m.m} side="a" />
                    <div style={{ flexShrink: 0, textAlign: "center", minWidth: 48 }}>
                      {res ? (
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>
                          <span style={{ color: winA ? GOLD : "#fff" }}>{res.as}</span>
                          <span style={{ color: INK_SUB, margin: "0 3px" }}>-</span>
                          <span style={{ color: !winA ? GOLD : "#fff" }}>{res.bs}</span>
                        </span>
                      ) : <span style={{ color: GOLD, fontSize: 11.5, fontWeight: 800, textShadow: `0 0 7px ${GOLD}66` }}>{m.time}</span>}
                    </div>
                    <Side slot={m.b} matchNum={m.m} side="b" />
                  </div>
                  <p style={{ color: "#3D4A5E", fontSize: 9.5, textAlign: "center", margin: "5px 0 0", letterSpacing: 0.3 }}>
                    {res ? (res.pens ? `Full time · ${win} win on penalties` : `Full time · ${m.venue}`) : `${m.date} · ${m.venue}`}
                  </p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Squad data: each player's 6 teams with flags (emoji) and current points
const SQUAD_DATA = [
  { name: "Lottie",  teams: [{ f:"🇲🇽", n:"Mexico", p:9 },{ f:"🇳🇱", n:"Netherlands", p:7 },{ f:"🇲🇦", n:"Morocco", p:7 },{ f:"🇦🇷", n:"Argentina", p:9 },{ f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", n:"England", p:7 },{ f:"🇵🇾", n:"Paraguay", p:4 }] },
  { name: "Tom",     teams: [{ f:"🇺🇸", n:"USA", p:6 },{ f:"🇧🇷", n:"Brazil", p:7 },{ f:"🇦🇺", n:"Australia", p:4 },{ f:"🇨🇮", n:"Ivory Coast", p:6 },{ f:"🇸🇦", n:"Saudi Arabia", p:2 },{ f:"🇧🇦", n:"Bosnia", p:4 }] },
  { name: "Joanne",  teams: [{ f:"🇩🇪", n:"Germany", p:6 },{ f:"🇨🇦", n:"Canada", p:7 },{ f:"🇨🇴", n:"Colombia", p:7 },{ f:"🇿🇦", n:"South Africa", p:4 },{ f:"🇨🇼", n:"Curaçao", p:1 },{ f:"🇹🇳", n:"Tunisia", p:0 }] },
  { name: "Sam",     teams: [{ f:"🇫🇷", n:"France", p:9 },{ f:"🇳🇴", n:"Norway", p:6 },{ f:"🇸🇪", n:"Sweden", p:4 },{ f:"🇪🇸", n:"Spain", p:7 },{ f:"🇺🇾", n:"Uruguay", p:2 },{ f:"🇺🇿", n:"Uzbekistan", p:0 }] },
  { name: "Joe",     teams: [{ f:"🇯🇵", n:"Japan", p:5 },{ f:"🇰🇷", n:"South Korea", p:3 },{ f:"🇧🇪", n:"Belgium", p:5 },{ f:"🇮🇷", n:"Iran", p:3 },{ f:"🇨🇩", n:"DR Congo", p:4 },{ f:"🇨🇿", n:"Czechia", p:1 }] },
  { name: "Darrell", teams: [{ f:"🇬🇭", n:"Ghana", p:4 },{ f:"🇨🇭", n:"Switzerland", p:7 },{ f:"🇵🇹", n:"Portugal", p:5 },{ f:"🇪🇨", n:"Ecuador", p:4 },{ f:"🇭🇹", n:"Haiti", p:0 },{ f:"🇵🇦", n:"Panama", p:0 }] },
  { name: "Matt",    teams: [{ f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", n:"Scotland", p:3 },{ f:"🇦🇹", n:"Austria", p:4 },{ f:"🇪🇬", n:"Egypt", p:5 },{ f:"🇸🇳", n:"Senegal", p:3 },{ f:"🇮🇶", n:"Iraq", p:0 },{ f:"🇩🇿", n:"Algeria", p:4 }] },
  { name: "Karina",  teams: [{ f:"🇳🇿", n:"New Zealand", p:1 },{ f:"🇨🇻", n:"Cape Verde", p:3 },{ f:"🇶🇦", n:"Qatar", p:1 },{ f:"🇹🇷", n:"Türkiye", p:3 },{ f:"🇯🇴", n:"Jordan", p:0 },{ f:"🇭🇷", n:"Croatia", p:6 }] },
];

// Flag lookup for every team, keyed by squad name, with the few groups.js spellings bridged.
const FLAGS = {};
SQUAD_DATA.forEach(s => s.teams.forEach(t => { FLAGS[t.n] = t.f; }));
function flagFor(name) {
  if (FLAGS[name]) return FLAGS[name];
  const cand = TEAM_ALIASES[name] || name;
  if (FLAGS[cand]) return FLAGS[cand];
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const k in FLAGS) if (norm(k) === norm(name) || norm(k) === norm(cand)) return FLAGS[k];
  return "🏳️";
}

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

const FX_CSS = `
@keyframes wcFloat { 0%{transform:translateY(30px) rotate(0deg);opacity:0} 8%{opacity:.16} 92%{opacity:.16} 100%{transform:translateY(-112vh) rotate(560deg);opacity:0} }
@keyframes wcPulse { 0%,100%{opacity:.30;transform:scale(1)} 50%{opacity:.62;transform:scale(1.1)} }
@keyframes wcShine { 0%{background-position:-150% 0} 55%,100%{background-position:160% 0} }
@keyframes wcBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes wcSpin { to{transform:rotate(360deg)} }
@keyframes wcRing { 0%{transform:scale(.7);opacity:.65} 100%{transform:scale(2.4);opacity:0} }
@keyframes wcFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes wcGlow { 0%,100%{filter:drop-shadow(0 0 4px currentColor)} 50%{filter:drop-shadow(0 0 14px currentColor)} }
@keyframes wcTrophyIn { 0%{transform:scale(0) rotate(-170deg);opacity:0} 55%{transform:scale(1.2) rotate(14deg);opacity:1} 76%{transform:scale(.92) rotate(-5deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes wcConfetti { 0%{transform:translateY(0) rotate(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(110vh) rotate(560deg);opacity:.9} }
@keyframes wcBurst { 0%{transform:translateY(0) scale(.3);opacity:0} 18%{opacity:1} 100%{transform:translateY(-170px) scale(1);opacity:0} }
@keyframes wcIntroFade { 0%{opacity:0} 5%{opacity:1} 86%{opacity:1} 100%{opacity:0;visibility:hidden} }
@keyframes wcSlowZoom { 0%{transform:scale(.88)} 100%{transform:scale(1.32)} }
@keyframes wcSpark { 0%{transform:scale(0) rotate(0);opacity:0} 30%{transform:scale(1.5) rotate(45deg);opacity:1} 100%{transform:scale(.5) rotate(95deg);opacity:0} }
@keyframes wcStreak { 0%{opacity:0} 12%{opacity:1} 24%{opacity:.25} 38%{opacity:1} 100%{opacity:0} }
@keyframes wcZapRing { 0%{transform:scale(.4);opacity:.9} 100%{transform:scale(2.5);opacity:0} }
`;

function GlobalFX() {
  const balls = [
    { l: "4%", s: 12, d: 24, delay: 0 }, { l: "13%", s: 30, d: 18, delay: 5 },
    { l: "24%", s: 16, d: 26, delay: 9 }, { l: "34%", s: 44, d: 21, delay: 2 },
    { l: "45%", s: 10, d: 29, delay: 13 }, { l: "55%", s: 22, d: 20, delay: 7 },
    { l: "64%", s: 36, d: 23, delay: 11 }, { l: "74%", s: 14, d: 27, delay: 3 },
    { l: "83%", s: 26, d: 19, delay: 15 }, { l: "91%", s: 40, d: 22, delay: 8 },
    { l: "97%", s: 13, d: 25, delay: 12 },
  ];
  return (
    <>
      <style>{FX_CSS}</style>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-12%", left: "-12%", width: "62vw", height: "62vw", borderRadius: "50%", background: `radial-gradient(circle, ${GREEN}2e, transparent 62%)`, filter: "blur(46px)", animation: "wcPulse 9s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-16%", right: "-12%", width: "58vw", height: "58vw", borderRadius: "50%", background: `radial-gradient(circle, ${MAGENTA}2a, transparent 62%)`, filter: "blur(48px)", animation: "wcPulse 11s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "28%", right: "16%", width: "44vw", height: "44vw", borderRadius: "50%", background: `radial-gradient(circle, ${VIOLET}26, transparent 62%)`, filter: "blur(54px)", animation: "wcPulse 13s ease-in-out infinite 4s" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "20%", width: "36vw", height: "36vw", borderRadius: "50%", background: `radial-gradient(circle, ${CYAN}1c, transparent 62%)`, filter: "blur(50px)", animation: "wcPulse 10s ease-in-out infinite 6s" }} />
        {balls.map((b, i) => (
          <span key={i} style={{ position: "absolute", left: b.l, bottom: "-50px", fontSize: b.s, opacity: 0.16, animation: `wcFloat ${b.d}s linear infinite ${b.delay}s` }}>⚽</span>
        ))}
      </div>
    </>
  );
}

// Full-screen 5-second trophy lift on load — confetti, rings, bursting balls.
function TrophyIntro({ onDone }) {
  const [started, setStarted] = useState(false);
  const [fading, setFading] = useState(false);
  const start = () => {
    if (started) return;
    setStarted(true);
    playFanfare();                 // fired directly inside the tap — most reliable for mobile
    setTimeout(() => setFading(true), 4100);
    setTimeout(onDone, 4700);
  };
  const confetti = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 3.6 + (i % 4) * 2) % 100,
    c: [GREEN, GOLD, MAGENTA, CYAN, VIOLET, "#fff"][i % 6],
    delay: (i % 12) * 0.16, dur: 2.3 + (i % 5) * 0.5, w: 5 + (i % 4) * 3,
  }));
  const rays = Array.from({ length: 10 }, (_, i) => i * 36);
  return (
    <div onClick={start} style={{
      position: "fixed", inset: 0, zIndex: 9999, cursor: "pointer", overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at 50% 44%, #0c1d38, #03060d 76%)",
      opacity: fading ? 0 : 1, transition: "opacity 0.6s ease",
    }}>
      {started && confetti.map((c, i) => (
        <span key={i} style={{ position: "absolute", top: "-24px", left: `${c.left}%`, width: c.w, height: c.w * 0.5, background: c.c, borderRadius: 1, boxShadow: `0 0 6px ${c.c}`, animation: `wcConfetti ${c.dur}s linear ${c.delay}s infinite` }} />
      ))}
      {started && [0, 1, 2].map(i => (
        <span key={i} style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", border: `2px solid ${GOLD}`, animation: `wcRing 2.4s ease-out ${i * 0.7}s infinite` }} />
      ))}
      {started && rays.map((deg, i) => (
        <span key={i} style={{ position: "absolute", transform: `rotate(${deg}deg)` }}>
          <span style={{ display: "inline-block", fontSize: 18, animation: `wcBurst 1.7s ease-out ${0.35 + i * 0.04}s both` }}>⚽</span>
        </span>
      ))}
      <div style={{ animation: started ? "wcSlowZoom 4.7s ease-out both" : "none", position: "relative", zIndex: 2 }}>
        <div style={{ animation: "wcBob 2.6s ease-in-out infinite" }}>
          <div style={{ fontSize: 112, lineHeight: 1, filter: `drop-shadow(0 0 34px ${GOLD})` }}>🏆</div>
        </div>
      </div>
      <div style={{ marginTop: 14, position: "relative", zIndex: 2, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: GREEN, textShadow: `0 0 12px ${GREEN}` }}>FIFA World Cup 2026</p>
        <p style={{ margin: "5px 0 0", fontSize: 32, fontWeight: 900, letterSpacing: -0.5,
          background: `linear-gradient(100deg, ${GOLD} 18%, #fff 50%, ${GOLD} 82%)`, backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "wcShine 2.4s linear infinite" }}>Sweepstake</p>
      </div>
      {!started && (
        <div style={{ position: "absolute", bottom: 70, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: "wcPulse 1.4s ease-in-out infinite" }}>
          <span style={{ fontSize: 30 }}>▶️</span>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", textShadow: `0 0 14px ${GREEN}` }}>Tap to kick off</span>
          <span style={{ color: INK_SUB, fontSize: 10.5 }}>(turn your ringer up for sound)</span>
        </div>
      )}
    </div>
  );
}

// Synthesised referee whistle via Web Audio — peep-peep-peeeep, no asset needed.
function playWhistle() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    try { ctx.resume(); } catch (e) {}
    const now = ctx.currentTime;
    const chirp = (start, dur, peak = 0.15) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 2300;
      const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = 2312;
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 26;
      const lfoG = ctx.createGain(); lfoG.gain.value = 85;
      lfo.connect(lfoG); lfoG.connect(o.frequency); lfoG.connect(o2.frequency);
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); o2.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(peak, start + 0.015);
      g.gain.setValueAtTime(peak, start + dur - 0.05);
      g.gain.linearRampToValueAtTime(0, start + dur);
      [o, o2, lfo].forEach(n => { n.start(start); n.stop(start + dur); });
    };
    chirp(now, 0.15); chirp(now + 0.23, 0.15); chirp(now + 0.46, 0.55);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1700);
  } catch (e) {}
}

// Epic intro fanfare — referee whistle kickoff, then a triumphant brass swell
// with timpani and a cymbal crash, fading out over ~4.5s to match the trophy intro.
function playFanfare() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    try { ctx.resume(); } catch (e) {}
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.55, now + 0.35);
    master.gain.setValueAtTime(0.55, now + 3.1);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 4.4);
    master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200; lp.connect(master);
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    // brass chord
    const chord = (notes, start, dur, gv = 0.15) => {
      const g = ctx.createGain(); g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gv, start + 0.06);
      g.gain.setValueAtTime(gv, start + dur - 0.1);
      g.gain.linearRampToValueAtTime(0.0001, start + dur);
      g.connect(lp);
      notes.forEach(n => [-7, 7].forEach(det => {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f(n); o.detune.value = det;
        o.connect(g); o.start(start); o.stop(start + dur);
      }));
    };
    const boom = (start, n) => {
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f(n) * 2, start); o.frequency.exponentialRampToValueAtTime(f(n), start + 0.16);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.55, start); g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      o.connect(g); g.connect(master); o.start(start); o.stop(start + 0.5);
    };
    const crash = (start, dur) => {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.14, start + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      src.connect(hp); hp.connect(g); g.connect(master); src.start(start); src.stop(start + dur);
    };
    // Triumphant progression: Am → F → C → G → big C
    const t = now + 0.12;
    chord([57, 60, 64], t, 0.62); boom(t, 45);
    chord([53, 57, 60], t + 0.62, 0.62); boom(t + 0.62, 41);
    chord([60, 64, 67], t + 1.24, 0.62); boom(t + 1.24, 48);
    chord([55, 59, 62], t + 1.86, 0.55); boom(t + 1.86, 43);
    chord([60, 64, 67, 72], t + 2.45, 1.5, 0.19); boom(t + 2.45, 48); crash(t + 2.4, 1.7);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 5400);
  } catch (e) {}
}

// Short UI blip for tab changes.
function playBlip() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); try { ctx.resume(); } catch (e) {} const now = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "triangle";
    o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(920, now + 0.07);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.14);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 300);
  } catch (e) {}
}

// Random coloured electric pops across the screen.
function ElectricFX() {
  const [bolts, setBolts] = useState([]);
  useEffect(() => {
    let id = 0;
    const colors = [GREEN, MAGENTA, CYAN, VIOLET, GOLD];
    const iv = setInterval(() => {
      const b = { id: id++, top: 8 + Math.random() * 82, left: 6 + Math.random() * 86, color: colors[(Math.random() * colors.length) | 0], kind: (Math.random() * 3) | 0, rot: (Math.random() * 360) | 0 };
      setBolts(p => [...p, b]);
      setTimeout(() => setBolts(p => p.filter(x => x.id !== b.id)), 1200);
    }, 1600);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 40, overflow: "hidden" }}>
      {bolts.map(b => {
        if (b.kind === 0) return <span key={b.id} style={{ position: "absolute", top: `${b.top}%`, left: `${b.left}%`, color: b.color, fontSize: 20, animation: "wcSpark 1.1s ease-out forwards", filter: `drop-shadow(0 0 9px ${b.color})` }}>✦</span>;
        if (b.kind === 1) return <span key={b.id} style={{ position: "absolute", top: `${b.top}%`, left: `${b.left}%`, width: 64, height: 3, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${b.color}, transparent)`, boxShadow: `0 0 12px ${b.color}`, transform: `rotate(${b.rot}deg)`, animation: "wcStreak 0.95s ease-out forwards" }} />;
        return <span key={b.id} style={{ position: "absolute", top: `${b.top}%`, left: `${b.left}%`, width: 28, height: 28, borderRadius: "50%", border: `2px solid ${b.color}`, boxShadow: `0 0 12px ${b.color}`, animation: "wcZapRing 1s ease-out forwards" }} />;
      })}
    </div>
  );
}

// Is a squad team (short name) still alive? Out if eliminated in the groups or the bracket.
function teamAlive(shortName) {
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const dead = new Set();
  for (const n of ELIMINATED) { dead.add(n); if (TEAM_ALIASES[n]) dead.add(TEAM_ALIASES[n]); }
  for (const n of koLosers()) { dead.add(n); if (TEAM_ALIASES[n]) dead.add(TEAM_ALIASES[n]); }
  for (const d of dead) {
    if (d === shortName || norm(d) === norm(shortName)) return false;
  }
  return true;
}

// One-line status per player — rewrite each update with what's just happened.
const BLURBS = {
  Lottie:  "Mexico, Morocco and Paraguay all march on — five still standing and clear at the top.",
  Tom:     "Brazil's through, but Norway knocked out his Ivory Coast — down to four, and Brazil face Norway next.",
  Sam:     "France crushed his own Sweden 3-0 and Norway's through too — Spain still to come. Title favourite.",
  Joanne:  "Germany's shock penalty exit to Paraguay leaves her down to Colombia and Canada.",
  Joe:     "Japan fell to Brazil — down to just Belgium and DR Congo now.",
  Darrell: "Mexico ended Ecuador's run — down to Switzerland, Portugal and Ghana.",
  Matt:    "Four teams still alive after a strong finish to the groups.",
  Karina:  "Down to two, but Croatia and Cape Verde keep her swinging.",
};

function FieldTab() {
  const winIdx = computeWinIndex();
  const pctOf = Object.fromEntries(winIdx.map(r => [r.name, r.pct]));
  const maxPct = Math.max(...winIdx.map(r => r.pct));
  const ranked = winIdx.map(r => PLAYERS.find(p => p.name === r.name));
  const medal = ["#FFD23F", "#C8D2E0", "#E08A4B"];
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ color: INK_SUB, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>
        The field, by <span style={{ color: GOLD }}>Win %</span> — a blend of live title odds and how many teams each player has left. Flags show who's <span style={{ color: "#fff" }}>alive</span> vs knocked out.
      </p>
      {ranked.map((p, i) => {
        const squad = SQUAD_DATA.find(s => s.name === p.name);
        const teams = squad ? squad.teams : [];
        const alive = teams.filter(t => teamAlive(t.n)).length;
        const pct = pctOf[p.name] || 0;
        const lead = i === 0;
        return (
          <div key={p.name} style={{
            background: `linear-gradient(135deg, ${p.color}1a, ${NAVY2} 55%)`,
            border: `1px solid ${p.color}44`, borderLeft: `4px solid ${p.color}`, borderRadius: 14,
            padding: "11px 13px", marginBottom: 9, boxShadow: `0 0 18px ${p.color}1c`, animation: "wcFade 0.4s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: medal[i] || "rgba(255,255,255,0.08)", color: medal[i] ? NAVY : INK_SUB, fontWeight: 900, fontSize: 11.5,
                boxShadow: medal[i] ? `0 0 10px ${medal[i]}88` : "none",
              }}>{i + 1}</span>
              <span style={{ color: p.color, fontSize: 15, fontWeight: 900, textShadow: `0 0 9px ${p.color}99`, flex: 1 }}>{p.name}</span>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>{alive}<span style={{ color: INK_SUB, fontWeight: 600, fontSize: 11 }}>/6 in</span></span>
            </div>
            <p style={{ color: "#C2CEE2", fontSize: 11.5, margin: "0 0 8px", lineHeight: 1.5, fontStyle: "italic" }}>{BLURBS[p.name]}</p>
            {/* Win % bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <span style={{ color: GOLD, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", minWidth: 38 }}>Win</span>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ width: `${(pct / maxPct) * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${p.color}, ${GOLD})`, boxShadow: `0 0 10px ${p.color}88` }} />
              </div>
              <span style={{ color: GOLD, fontSize: 12.5, fontWeight: 900, minWidth: 42, textAlign: "right", textShadow: `0 0 8px ${GOLD}77` }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {teams.map(t => {
                const live = teamAlive(t.n);
                return (
                  <span key={t.n} style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 16,
                    background: live ? `${p.color}1f` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${live ? p.color + "66" : "rgba(255,255,255,0.05)"}`,
                    opacity: live ? 1 : 0.38, boxShadow: live ? `0 0 8px ${p.color}22` : "none",
                  }}>
                    <span style={{ fontSize: 12.5, filter: live ? "none" : "grayscale(1)" }}>{t.f}</span>
                    <span style={{ color: live ? "#fff" : INK_SUB, fontSize: 10.5, fontWeight: live ? 700 : 500, textDecoration: live ? "none" : "line-through" }}>{t.n}</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SweepstakeDashboard() {
  const [view, setView] = useState("knockouts");
  const [intro, setIntro] = useState(true);
  const tabs = [
    { id: "knockouts", label: "Knockouts" },
    { id: "fixtures",  label: "Fixtures" },
  ];

  return (
    <div style={{ background: `radial-gradient(ellipse at 50% -20%, #0c1a30 0%, ${NAVY} 55%)`, minHeight: "100vh", fontFamily: "'Inter','Helvetica Neue',sans-serif", padding: "20px 16px", display: "flex", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <GlobalFX />
      <ElectricFX />
      {intro && <TrophyIntro onDone={() => setIntro(false)} />}
      <div style={{ width: "100%", maxWidth: 760, position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ color: GREEN, fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px", textShadow: `0 0 10px ${GREEN}`, animation: "wcGlow 3s ease-in-out infinite" }}>World Cup 2026</p>
            <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, lineHeight: 1 }}>
              <span style={{
                fontSize: 31, fontWeight: 900, letterSpacing: -1,
                background: `linear-gradient(100deg, #fff 20%, ${GREEN} 40%, #fff 55%, ${CYAN} 70%, #fff 85%)`,
                backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text",
                WebkitTextFillColor: "transparent", animation: "wcShine 6s linear infinite",
              }}>Sweepstake</span>
              <span style={{ display: "inline-block", fontSize: 26, animation: "wcBob 2.4s ease-in-out infinite", filter: `drop-shadow(0 0 8px ${GOLD})` }}>🏆</span>
            </h1>
            <p style={{ color: INK_SUB, fontSize: 12, margin: "6px 0 0" }}>Updated {LAST_UPDATED}</p>
          </div>
          <button onClick={playWhistle} aria-label="Whistle" style={{
            width: 38, height: 38, borderRadius: "50%", cursor: "pointer", flexShrink: 0,
            border: `1px solid ${GREEN}66`, background: `${GREEN}18`, color: GREEN, fontSize: 17,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${GREEN}44`,
          }}>🔊</button>
        </div>

        {/* Tabs — three, full width */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {tabs.map(t => {
              const active = view === t.id;
              return (
                <button key={t.id} onClick={() => { playBlip(); setView(t.id); }} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                  fontSize: 12.5, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase",
                  background: active ? `linear-gradient(135deg, ${GREEN}, ${CYAN})` : "rgba(255,255,255,0.05)",
                  color: active ? NAVY : INK_SUB,
                  border: `1px solid ${active ? GREEN : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.2s", whiteSpace: "nowrap",
                  boxShadow: active ? `0 0 20px ${GREEN}66` : "none",
                }}>{t.label}</button>
              );
            })}
          </div>
        </div>

        {/* Tab content with fade animation */}
        <TabPanel key={view}>
          {view === "knockouts" && <BracketTab />}
          {view === "fixtures" && <FixturesTab />}
        </TabPanel>
      </div>
    </div>
  );
}
