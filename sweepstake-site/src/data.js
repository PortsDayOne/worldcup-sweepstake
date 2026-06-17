// =====================================================================
//  SWEEPSTAKE DATA  —  this is the ONLY file you need to edit to update.
//  After editing, save, commit & push to GitHub. The site updates itself.
// =====================================================================

export const LAST_UPDATED = "16 June 2026 · after 21 matches";

// Each player: name, colour, total points, games played, and their teams.
// Keep them in any order — the site sorts by points automatically.
export const PLAYERS = [
  { name: "Tom",     color: "#F0C446", total: 12, played: 6, teams: "USA (3), Australia (3), Ivory Coast (3), Brazil (1), Bosnia (1), Saudi Arabia (1)" },
  { name: "Sam",     color: "#FF9F43", total: 11, played: 5, teams: "France (3), Norway (3), Sweden (3), Spain (1), Uruguay (1)" },
  { name: "Lottie",  color: "#40C6A0", total: 8,  played: 5, teams: "Mexico (3), Argentina (3), Morocco (1), Netherlands (1), Paraguay (0)" },
  { name: "Matt",    color: "#C77DFF", total: 7,  played: 6, teams: "Scotland (3), Austria (3), Egypt (1), Senegal (0), Iraq (0), Algeria (0)" },
  { name: "Joe",     color: "#5896FF", total: 6,  played: 5, teams: "South Korea (3), Belgium (1), Japan (1), Iran (1), Czechia (0)" },
  { name: "Joanne",  color: "#E0556E", total: 4,  played: 4, teams: "Germany (3), Canada (1), South Africa (0), Curaçao (0), Tunisia (0)" },
  { name: "Karina",  color: "#4ECDC4", total: 3,  played: 4, teams: "Cape Verde (1), Qatar (1), New Zealand (1), Türkiye (0), Jordan (0)" },
  { name: "Darrell", color: "#9DB2BF", total: 1,  played: 3, teams: "Switzerland (1), Haiti (0), Ecuador (0)" },
];

// Cumulative points after each matchday — add a new row each update.
export const PROGRESSION = [
  { day: "11 Jun",    Tom: 0,  Lottie: 3, Joe: 3, Joanne: 0, Matt: 0, Sam: 0, Karina: 0, Darrell: 0 },
  { day: "12 Jun",    Tom: 4,  Lottie: 3, Joe: 3, Joanne: 1, Matt: 0, Sam: 0, Karina: 0, Darrell: 0 },
  { day: "13 Jun",    Tom: 5,  Lottie: 4, Joe: 3, Joanne: 1, Matt: 3, Sam: 0, Karina: 1, Darrell: 1 },
  { day: "14 Jun",    Tom: 11, Lottie: 5, Joe: 4, Joanne: 4, Matt: 3, Sam: 0, Karina: 1, Darrell: 1 },
  { day: "15 Jun",    Tom: 11, Lottie: 5, Joe: 5, Joanne: 4, Matt: 4, Sam: 4, Karina: 2, Darrell: 1 },
  { day: "15 Jun pm", Tom: 12, Lottie: 5, Joe: 6, Joanne: 4, Matt: 4, Sam: 5, Karina: 3, Darrell: 1 },
  { day: "16 Jun",    Tom: 12, Lottie: 8, Joe: 6, Joanne: 4, Matt: 7, Sam: 11, Karina: 3, Darrell: 1 },
];

// Most recent results to show as score cards.
export const RECENT = [
  { a: "France", ga: 3, gb: 1, b: "Senegal" },
  { a: "Norway", ga: 4, gb: 1, b: "Iraq" },
  { a: "Argentina", ga: 3, gb: 0, b: "Algeria" },
  { a: "Austria", ga: 3, gb: 1, b: "Jordan" },
];
