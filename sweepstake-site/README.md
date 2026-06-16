# World Cup 2026 Sweepstake Dashboard

A live, auto-updating sweepstake leaderboard. Built with Vite + React + Recharts.

---

## How to put it online (one-time setup, ~15 min)

You'll need two free accounts: **GitHub** (stores the code) and **Vercel** (hosts the live site).

### 1. Put the code on GitHub
1. Go to https://github.com and sign up / log in.
2. Click the **+** (top right) → **New repository**.
3. Name it something like `worldcup-sweepstake`, leave it Public, click **Create repository**.
4. On the next page click **uploading an existing file**.
5. Drag in **everything from this folder EXCEPT the `node_modules` and `dist` folders** (if you see them). The key things to include: `index.html`, `package.json`, `vite.config.js`, `.gitignore`, and the whole `src` folder.
6. Click **Commit changes**.

### 2. Connect Vercel
1. Go to https://vercel.com and **Sign up with GitHub** (easiest — one click).
2. Click **Add New… → Project**.
3. Find your `worldcup-sweepstake` repo and click **Import**.
4. Vercel auto-detects Vite — just click **Deploy**.
5. Wait ~1 minute. You'll get a live link like `worldcup-sweepstake.vercel.app`.

That link is now your shareable, always-live dashboard. 🎉

---

## How to update scores

You only ever edit **one file**: `src/data.js`.

1. On GitHub, open `src/data.js` and click the ✏️ pencil icon to edit.
2. Update the numbers (player totals, games played, teams, add a progression row, swap the recent results).
3. Scroll down, click **Commit changes**.
4. Vercel automatically rebuilds — your live link shows the new data in about a minute. Same link, always current.

(Or send the new scores to Claude, who'll give you the updated `data.js` to paste in.)

---

## Run it on your own computer (optional)

```bash
npm install
npm run dev
```

Then open the local link it prints (usually http://localhost:5173).
