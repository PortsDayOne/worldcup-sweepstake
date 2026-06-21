// =====================================================================
//  SWEEPSTAKE DATA  —  this is the ONLY file you need to edit to update.
//  After editing, save, commit & push to GitHub. The site updates itself.
// =====================================================================

export const LAST_UPDATED = "21 June 2026 · after 40 matches";

// Each player: name, colour, total points, games played, and their teams.
// Keep them in any order — the site sorts by points automatically.
export const PLAYERS = [
  { name: "Lottie",  color: "#40C6A0", total: 23, played: 9,  teams: "Mexico (6), Morocco (4), Argentina (3), England (3), Netherlands (4), Paraguay (3)" },
  { name: "Tom",     color: "#F0C446", total: 18, played: 10, teams: "USA (6), Brazil (4), Australia (3), Ivory Coast (3), Saudi Arabia (1), Bosnia (1)" },
  { name: "Joanne",  color: "#E0556E", total: 15, played: 10, teams: "Canada (4), Germany (6), Colombia (3), South Africa (1), Curaçao (1), Tunisia (0)" },
  { name: "Sam",     color: "#FF9F43", total: 11, played: 7,  teams: "France (3), Norway (3), Sweden (3), Spain (1), Uruguay (1), Uzbekistan (0)" },
  { name: "Joe",     color: "#5896FF", total: 11, played: 8,  teams: "South Korea (3), Japan (4), Belgium (1), Iran (1), DR Congo (1), Czechia (1)" },
  { name: "Darrell", color: "#9DB2BF", total: 9,  played: 9,  teams: "Ghana (3), Switzerland (4), Portugal (1), Ecuador (1), Haiti (0), Panama (0)" },
  { name: "Matt",    color: "#C77DFF", total: 7,  played: 7,  teams: "Scotland (3), Austria (3), Egypt (1), Senegal (0), Iraq (0), Algeria (0)" },
  { name: "Karina",  color: "#4ECDC4", total: 3,  played: 7,  teams: "New Zealand (1), Cape Verde (1), Qatar (1), Türkiye (0), Jordan (0), Croatia (0)" },
];

// Cumulative points after each matchday — add a new row each update.
export const PROGRESSION = [
  { day: "Start",     Tom: 0,  Lottie: 0, Joe: 0, Joanne: 0, Matt: 0, Sam: 0, Karina: 0, Darrell: 0 },
  { day: "11 Jun",    Tom: 0,  Lottie: 3, Joe: 3, Joanne: 0, Matt: 0, Sam: 0, Karina: 0, Darrell: 0 },
  { day: "12 Jun",    Tom: 4,  Lottie: 3, Joe: 3, Joanne: 1, Matt: 0, Sam: 0, Karina: 0, Darrell: 0 },
  { day: "13 Jun",    Tom: 5,  Lottie: 4, Joe: 3, Joanne: 1, Matt: 3, Sam: 0, Karina: 1, Darrell: 1 },
  { day: "14 Jun",    Tom: 11, Lottie: 5, Joe: 4, Joanne: 4, Matt: 3, Sam: 0, Karina: 1, Darrell: 1 },
  { day: "15 Jun",    Tom: 11, Lottie: 5, Joe: 5, Joanne: 4, Matt: 4, Sam: 4, Karina: 2, Darrell: 1 },
  { day: "15 Jun pm", Tom: 12, Lottie: 5, Joe: 6, Joanne: 4, Matt: 4, Sam: 5, Karina: 3, Darrell: 1 },
  { day: "16 Jun",    Tom: 12, Lottie: 8, Joe: 6, Joanne: 4, Matt: 7, Sam: 11, Karina: 3, Darrell: 1 },
  { day: "17 Jun",    Tom: 12, Lottie: 11, Joe: 7, Joanne: 7, Matt: 7, Sam: 11, Karina: 3, Darrell: 5 },
  { day: "18 Jun",    Tom: 12, Lottie: 14, Joe: 8, Joanne: 11, Matt: 7, Sam: 11, Karina: 3, Darrell: 8 },
  { day: "19 Jun",    Tom: 18, Lottie: 20, Joe: 8, Joanne: 11, Matt: 7, Sam: 11, Karina: 3, Darrell: 8 },
  { day: "20 Jun",    Tom: 18, Lottie: 23, Joe: 11, Joanne: 15, Matt: 7, Sam: 11, Karina: 3, Darrell: 9 },
];

// Most recent results to show as score cards.
export const RECENT = [
  { a: "Germany",     ga: 2, gb: 1, b: "Ivory Coast" },
  { a: "Netherlands", ga: 5, gb: 1, b: "Sweden" },
  { a: "Japan",       ga: 4, gb: 0, b: "Tunisia" },
  { a: "Ecuador",     ga: 0, gb: 0, b: "Curaçao" },
];
