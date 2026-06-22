"""
World Cup 2026 Sweepstake Auto-Updater
Fetches live results from football-data.org and updates data.js, groups.js, SweepstakeDashboard.jsx
"""

import requests, json, os, re
from datetime import datetime, timezone

API_KEY = os.environ.get("FD_API_KEY", "")
BASE = "https://api.football-data.org/v4"
WC_CODE = "WC"  # World Cup competition code
HEADERS = {"X-Auth-Token": API_KEY}

# ── SWEEPSTAKE OWNER MAP ─────────────────────────────────────────────────────
OWNERS = {
    "Mexico": "Lottie", "South Korea": "Joe", "South Africa": "Joanne", "Czechia": "Joe",
    "Canada": "Joanne", "Bosnia and Herzegovina": "Tom", "Qatar": "Karina", "Switzerland": "Darrell",
    "Scotland": "Matt", "Brazil": "Tom", "Morocco": "Lottie", "Haiti": "Darrell",
    "United States": "Tom", "Australia": "Tom", "Türkiye": "Karina", "Paraguay": "Lottie",
    "Germany": "Joanne", "Côte d'Ivoire": "Tom", "Ecuador": "Darrell", "Curaçao": "Joanne",
    "Netherlands": "Lottie", "Sweden": "Sam", "Japan": "Joe", "Tunisia": "Joanne",
    "Belgium": "Joe", "IR Iran": "Joe", "New Zealand": "Karina", "Egypt": "Matt",
    "Spain": "Sam", "Saudi Arabia": "Tom", "Uruguay": "Sam", "Cabo Verde": "Karina",
    "France": "Sam", "Senegal": "Matt", "Norway": "Sam", "Iraq": "Matt",
    "Argentina": "Lottie", "Algeria": "Matt", "Austria": "Matt", "Jordan": "Karina",
    "Portugal": "Darrell", "DR Congo": "Joe", "Colombia": "Joanne", "Uzbekistan": "Sam",
    "England": "Lottie", "Croatia": "Karina", "Ghana": "Darrell", "Panama": "Darrell",
}

# Display name mapping (API name → display name)
DISPLAY = {
    "United States": "USA", "Bosnia and Herzegovina": "Bosnia",
    "Côte d'Ivoire": "Ivory Coast", "IR Iran": "Iran",
    "Cabo Verde": "Cape Verde", "Türkiye": "Turkiye",
}

PLAYER_COLORS = {
    "Tom": "#F0C446", "Lottie": "#40C6A0", "Sam": "#FF9F43", "Joanne": "#E0556E",
    "Matt": "#C77DFF", "Joe": "#5896FF", "Darrell": "#9DB2BF", "Karina": "#4ECDC4",
}

PLAYERS = ["Lottie", "Tom", "Sam", "Joanne", "Joe", "Darrell", "Matt", "Karina"]

def pts(w, d):
    return w * 3 + d

def api(path):
    r = requests.get(f"{BASE}{path}", headers=HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()

def display(name):
    return DISPLAY.get(name, name)

def main():
    print("Fetching World Cup matches...")

    # Get all finished matches
    data = api(f"/competitions/{WC_CODE}/matches?status=FINISHED")
    matches = data.get("matches", [])
    print(f"Found {len(matches)} finished matches")

    # Get upcoming matches for fixtures tab
    upcoming = api(f"/competitions/{WC_CODE}/matches?status=SCHEDULED")
    upcoming_matches = upcoming.get("matches", [])[:16]

    # Get group standings
    standings_data = api(f"/competitions/{WC_CODE}/standings")
    standings = standings_data.get("standings", [])

    # ── Calculate per-team sweepstake points ───────────────────────────────
    team_pts = {}   # team display name → sweepstake points
    team_gp = {}    # games played
    team_results = {}  # team → list of results for per-team string

    for m in matches:
        home = m["homeTeam"]["name"]
        away = m["awayTeam"]["name"]
        hg = m["score"]["fullTime"]["home"]
        ag = m["score"]["fullTime"]["away"]
        if hg is None or ag is None:
            continue
        h_disp = display(home)
        a_disp = display(away)
        h_pts = 3 if hg > ag else (1 if hg == ag else 0)
        a_pts = 3 if ag > hg else (1 if hg == ag else 0)
        team_pts[h_disp] = team_pts.get(h_disp, 0) + h_pts
        team_pts[a_disp] = team_pts.get(a_disp, 0) + a_pts
        team_gp[h_disp] = team_gp.get(h_disp, 0) + 1
        team_gp[a_disp] = team_gp.get(a_disp, 0) + 1

    # ── Calculate player totals ────────────────────────────────────────────
    player_totals = {p: 0 for p in PLAYERS}
    player_played = {p: 0 for p in PLAYERS}
    player_teams = {p: {} for p in PLAYERS}  # player → {team: pts}

    for team, owner in OWNERS.items():
        t_disp = display(team)
        if owner in player_totals:
            t_p = team_pts.get(t_disp, 0)
            player_totals[owner] += t_p
            player_played[owner] += team_gp.get(t_disp, 0)
            player_teams[owner][t_disp] = t_p

    # ── Recent results (last 4 finished matches) ───────────────────────────
    recent = matches[-4:][::-1]
    recent_js = []
    for m in recent:
        hg = m["score"]["fullTime"]["home"]
        ag = m["score"]["fullTime"]["away"]
        if hg is None: continue
        recent_js.append({
            "a": display(m["homeTeam"]["name"]),
            "ga": hg, "gb": ag,
            "b": display(m["awayTeam"]["name"])
        })

    # ── Progression: one entry per date ───────────────────────────────────
    # Build cumulative points by date
    from collections import defaultdict
    daily = defaultdict(lambda: {p: 0 for p in PLAYERS})
    running = {p: 0 for p in PLAYERS}
    dates_seen = []

    sorted_matches = sorted(matches, key=lambda m: m["utcDate"])
    for m in sorted_matches:
        hg = m["score"]["fullTime"]["home"]
        ag = m["score"]["fullTime"]["away"]
        if hg is None: continue
        date_str = m["utcDate"][:10]
        home_d = display(m["homeTeam"]["name"])
        away_d = display(m["awayTeam"]["name"])
        h_pts = 3 if hg > ag else (1 if hg == ag else 0)
        a_pts = 3 if ag > hg else (1 if hg == ag else 0)
        for team, p in [(home_d, h_pts), (away_d, a_pts)]:
            owner = OWNERS.get(team, OWNERS.get(
                next((k for k,v in DISPLAY.items() if v==team), None), None))
            if owner:
                running[owner] += p
        if date_str not in dates_seen:
            dates_seen.append(date_str)
        for p in PLAYERS:
            daily[date_str][p] = running[p]

    # Format progression
    prog_rows = [f'  {{ day: "Start", {", ".join(f"{p}: 0" for p in PLAYERS)} }}']
    for d in dates_seen:
        label = datetime.strptime(d, "%Y-%m-%d").strftime("%-d %b")
        vals = ", ".join(f"{p}: {daily[d][p]}" for p in PLAYERS)
        prog_rows.append(f'  {{ day: "{label}", {vals} }}')

    # ── Fixtures ──────────────────────────────────────────────────────────
    fixture_lines = []
    for m in upcoming_matches:
        utc = datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00"))
        bst = utc.replace(tzinfo=timezone.utc)
        # Convert to BST (UTC+1)
        from datetime import timedelta
        bst_time = utc + timedelta(hours=1)
        time_str = bst_time.strftime("%-I%p BST").lower().replace("am","am").replace("pm","pm")
        date_str = bst_time.strftime("%a %-d %b")
        home_d = display(m["homeTeam"]["name"])
        away_d = display(m["awayTeam"]["name"])
        group = m.get("group", "").replace("GROUP_", "").replace("Group ", "")
        fixture_lines.append(
            f'  {{ date: "{date_str}", time: "{time_str} BST", home: "{home_d}", away: "{away_d}", group: "{group}" }}'
        )

    # ── Build player teams string ──────────────────────────────────────────
    def teams_string(player):
        teams = player_teams[player]
        sorted_teams = sorted(teams.items(), key=lambda x: -x[1])
        return ", ".join(f"{t} ({p})" for t, p in sorted_teams)

    # ── Sorted standings ──────────────────────────────────────────────────
    ranked = sorted(PLAYERS, key=lambda p: -player_totals[p])
    now = datetime.utcnow().strftime("%-d %B %Y")
    total_matches = len(matches)

    # ── Write data.js ─────────────────────────────────────────────────────
    players_js = "\n".join(
        f'  {{ name: "{p}", color: "{PLAYER_COLORS[p]}", total: {player_totals[p]}, played: {player_played[p]}, teams: "{teams_string(p)}" }}{"," if i < len(PLAYERS)-1 else ""}'
        for i, p in enumerate(ranked)
    )
    recent_js_str = "\n".join(
        f'  {{ a: "{r["a"]}", ga: {r["ga"]}, gb: {r["gb"]}, b: "{r["b"]}" }}{"," if i < len(recent_js)-1 else ""}'
        for i, r in enumerate(recent_js)
    )
    prog_str = ",\n".join(prog_rows)

    data_js = f"""// AUTO-GENERATED by update_scores.py — do not edit manually
export const LAST_UPDATED = "{now} · after {total_matches} matches";

export const PLAYERS = [
{players_js}
];

export const PROGRESSION = [
{prog_str}
];

export const RECENT = [
{recent_js_str}
];
"""

    # ── Write groups.js ───────────────────────────────────────────────────
    groups_out = []
    confirmed = set()
    eliminated = set()

    for sg in standings:
        group_name = sg.get("group", "").replace("GROUP_", "Group ")
        table = sg.get("table", [])
        teams_out = []
        sorted_table = sorted(table, key=lambda x: (-x["points"], -(x["goalsFor"]-x["goalsAgents"] if "goalsAgents" in x else x.get("goalDifference", 0))))
        for i, row in enumerate(table):
            t = row["team"]["name"]
            t_d = display(t)
            gp = row["playedGames"]
            w = row["won"]; d = row["draw"]; l = row["lost"]
            gf = row["goalsFor"]; ga = row["goalsAgainst"]
            p = row["points"]
            gd = gf - ga
            teams_out.append(f'    {{ name: "{t_d}", gp:{gp}, w:{w}, d:{d}, l:{l}, gf:{gf}, ga:{ga}, pts:{p} }}')
            # Confirmed: top 2 with 2+ games, can't be caught
            # Eliminated: bottom teams with 0 pts after 2 games and can't reach 2nd
            remaining = 3 - gp
            max_pts = p + remaining * 3
            if i >= 2 and gp >= 2:
                second_pts = table[1]["points"] if len(table) > 1 else 99
                if max_pts < second_pts:
                    eliminated.add(t_d)
            if i < 2 and gp >= 2:
                third_max = (table[2]["points"] + (3-table[2]["playedGames"])*3) if len(table) > 2 else 0
                if p > third_max:
                    confirmed.add(t_d)

        groups_out.append(f'  {{ name: "{group_name}", teams: [\n' + ',\n'.join(teams_out) + '\n  ]}')

    owners_js = "\n".join(f'  "{display(k)}": "{v}",' for k,v in OWNERS.items())
    colors_js = ", ".join(f'"{p}": "{c}"' for p,c in PLAYER_COLORS.items())
    groups_content = f"""// AUTO-GENERATED
export const OWNERS = {{
{owners_js}
}};
export const PLAYER_COLORS = {{ {colors_js} }};
export const GROUPS = [
{chr(10).join(groups_out)}
];
"""

    # ── Update SweepstakeDashboard.jsx confirmed/eliminated sets ──────────
    src_path = "sweepstake-site/src/SweepstakeDashboard.jsx"
    with open(src_path) as f:
        dash = f.read()

    confirmed_str = ', '.join(f'"{t}"' for t in sorted(confirmed))
    eliminated_str = ', '.join(f'"{t}"' for t in sorted(eliminated))

    dash = re.sub(
        r'const CONFIRMED = new Set\(\[.*?\]\);',
        f'const CONFIRMED = new Set([{confirmed_str}]);',
        dash
    )
    dash = re.sub(
        r'const ELIMINATED = new Set\(\[.*?\]\);',
        f'const ELIMINATED = new Set([{eliminated_str}]);',
        dash
    )

    # Update fixtures in dashboard
    fixtures_str = "const FIXTURES = [\n" + ",\n".join(fixture_lines) + "\n];"
    dash = re.sub(r'const FIXTURES = \[[\s\S]*?\];', fixtures_str, dash)

    # Write files
    with open("sweepstake-site/src/data.js", "w") as f:
        f.write(data_js)
    with open("sweepstake-site/src/groups.js", "w") as f:
        f.write(groups_content)
    with open(src_path, "w") as f:
        f.write(dash)

    print(f"✓ Updated: {now}, {total_matches} matches")
    print(f"✓ Leader: {ranked[0]} with {player_totals[ranked[0]]} pts")
    print(f"✓ Confirmed: {confirmed}")
    print(f"✓ Eliminated: {eliminated}")

if __name__ == "__main__":
    main()
