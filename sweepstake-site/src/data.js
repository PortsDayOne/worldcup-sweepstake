// =====================================================================
//  SWEEPSTAKE DATA  —  this is the ONLY file you need to edit to update.
//  After editing, save, commit & push to GitHub. The site updates itself.
// =====================================================================

export const LAST_UPDATED = "18 June 2026 · after 29 matches";

// Each player: name, colour, total points, games played, and their teams.
// Keep them in any order — the site sorts by points automatically.
export const PLAYERS = [
  { name: "Lottie",  color: "#40C6A0", total: 14, played: 7, teams: "Mexico (3), Argentina (3), England (3), Morocco (1), Netherlands (1), Paraguay (0)" },
  { name: "Tom",     color: "#F0C446", total: 12, played: 7, teams: "USA (3), Australia (3), Ivory Coast (3), Brazil (1), Saudi Arabia (1), Bosnia (1)" },
  { name: "Sam",     color: "#FF9F43", total: 11, played: 6, teams: "France (3), Norway (3), Sweden (3), Spain (1), Uruguay (1), Uzbekistan (0)" },
  { name: "Joanne",  color: "#E0556E", total: 11, played: 7, teams: "Germany (3), Colombia (3), Canada (3), South Africa (1), Curaçao (0), Tunisia (0)" },
  { name: "Joe",     color: "#5896FF", total: 8,  played: 7, teams: "South Korea (3), Belgium (1), Japan (1), Iran (1), DR Congo (1), Czechia (1)" },
  { name: "Darrell", color: "#9DB2BF", total: 8,  played: 7, teams: "Ghana (3), Switzerland (3), Portugal (1), Haiti (0), Ecuador (0), Panama (0)" },
  { name: "Matt",    color: "#C77DFF", total: 7,  played: 6, teams: "Scotland (3), Austria (3), Egypt (1), Senegal (0), Iraq (0), Algeria (0)" },
  { name: "Karina",  color: "#4ECDC4", total: 3,  played: 6, teams: "Cape Verde (1), New Zealand (1), Qatar (1), Türkiye (0), Jordan (0), Croatia (0)" },
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
];

// Most recent results to show as score cards.
export const RECENT = [
  { a: "Mexico", ga: 1, gb: 0, b: "South Korea" },
  { a: "Switzerland", ga: 4, gb: 1, b: "Bosnia" },
  { a: "Canada", ga: 6, gb: 0, b: "Qatar" },
  { a: "Czechia", ga: 1, gb: 1, b: "South Africa" },
];
