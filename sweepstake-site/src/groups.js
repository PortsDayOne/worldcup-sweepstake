// =====================================================================
//  GROUP STAGE DATA — update pts/gp/w/d/l/gf/ga after each matchday
// =====================================================================

// Owner lookup — which player owns each team
export const OWNERS = {
  // Group A
  "Mexico": "Lottie", "South Korea": "Joe", "South Africa": "Joanne", "Czechia": "Joe",
  // Group B
  "Canada": "Joanne", "Bosnia": "Tom", "Qatar": "Karina", "Switzerland": "Darrell",
  // Group C
  "Scotland": "Matt", "Brazil": "Tom", "Morocco": "Lottie", "Haiti": "Darrell",
  // Group D
  "USA": "Tom", "Australia": "Tom", "Turkiye": "Karina", "Paraguay": "Lottie",
  // Group E
  "Germany": "Joanne", "Ivory Coast": "Tom", "Ecuador": "Darrell", "Curacao": "Joanne",
  // Group F
  "Netherlands": "Lottie", "Sweden": "Sam", "Japan": "Joe", "Tunisia": "Joanne",
  // Group G
  "Belgium": "Joe", "Iran": "Joe", "New Zealand": "Karina", "Egypt": "Matt",
  // Group H
  "Spain": "Sam", "Saudi Arabia": "Tom", "Uruguay": "Sam", "Cape Verde": "Karina",
  // Group I
  "France": "Sam", "Senegal": "Matt", "Norway": "Sam", "Iraq": "Matt",
  // Group J
  "Argentina": "Lottie", "Algeria": "Matt", "Austria": "Matt", "Jordan": "Karina",
  // Group K
  "Portugal": "Darrell", "DR Congo": "Joe", "Colombia": "Joanne", "Uzbekistan": "Sam",
  // Group L
  "England": "Lottie", "Croatia": "Karina", "Ghana": "Darrell", "Panama": "Darrell",
};

// Player colours for owner badges
export const PLAYER_COLORS = {
  Tom: "#F0C446", Lottie: "#40C6A0", Sam: "#FF9F43", Joanne: "#E0556E",
  Matt: "#C77DFF", Joe: "#5896FF", Darrell: "#9DB2BF", Karina: "#4ECDC4",
};

// All 12 groups — update pts/gp/w/d/l/gf/ga after each matchday
export const GROUPS = [
  {
    name: "Group A",
    teams: [
      { name: "Mexico",       gp:2, w:2, d:0, l:0, gf:3, ga:0, pts:6 },
      { name: "South Korea",  gp:2, w:1, d:0, l:1, gf:2, ga:2, pts:3 },
      { name: "Czechia",      gp:2, w:0, d:1, l:1, gf:2, ga:3, pts:1 },
      { name: "South Africa", gp:2, w:0, d:1, l:1, gf:1, ga:3, pts:1 },
    ]
  },
  {
    name: "Group B",
    teams: [
      { name: "Canada",    gp:2, w:1, d:1, l:0, gf:7, ga:1, pts:4 },
      { name: "Switzerland",gp:2, w:1, d:1, l:0, gf:5, ga:2, pts:4 },
      { name: "Bosnia",    gp:2, w:0, d:1, l:1, gf:2, ga:5, pts:1 },
      { name: "Qatar",     gp:2, w:0, d:1, l:1, gf:1, ga:7, pts:1 },
    ]
  },
  {
    name: "Group C",
    teams: [
      { name: "Scotland", gp:1, w:1, d:0, l:0, gf:1, ga:0, pts:3 },
      { name: "Brazil",   gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "Morocco",  gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "Haiti",    gp:1, w:0, d:0, l:1, gf:0, ga:1, pts:0 },
    ]
  },
  {
    name: "Group D",
    teams: [
      { name: "USA",      gp:1, w:1, d:0, l:0, gf:4, ga:1, pts:3 },
      { name: "Australia",gp:1, w:1, d:0, l:0, gf:2, ga:0, pts:3 },
      { name: "Turkiye",  gp:1, w:0, d:0, l:1, gf:0, ga:2, pts:0 },
      { name: "Paraguay", gp:1, w:0, d:0, l:1, gf:1, ga:4, pts:0 },
    ]
  },
  {
    name: "Group E",
    teams: [
      { name: "Germany",     gp:1, w:1, d:0, l:0, gf:7, ga:1, pts:3 },
      { name: "Ivory Coast", gp:1, w:1, d:0, l:0, gf:1, ga:0, pts:3 },
      { name: "Ecuador",     gp:1, w:0, d:0, l:1, gf:0, ga:1, pts:0 },
      { name: "Curacao",     gp:1, w:0, d:0, l:1, gf:1, ga:7, pts:0 },
    ]
  },
  {
    name: "Group F",
    teams: [
      { name: "Sweden",      gp:1, w:1, d:0, l:0, gf:5, ga:1, pts:3 },
      { name: "Netherlands", gp:1, w:0, d:1, l:0, gf:2, ga:2, pts:1 },
      { name: "Japan",       gp:1, w:0, d:1, l:0, gf:2, ga:2, pts:1 },
      { name: "Tunisia",     gp:1, w:0, d:0, l:1, gf:1, ga:5, pts:0 },
    ]
  },
  {
    name: "Group G",
    teams: [
      { name: "Belgium",     gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "Iran",        gp:1, w:0, d:1, l:0, gf:2, ga:2, pts:1 },
      { name: "New Zealand", gp:1, w:0, d:1, l:0, gf:2, ga:2, pts:1 },
      { name: "Egypt",       gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
    ]
  },
  {
    name: "Group H",
    teams: [
      { name: "Spain",       gp:1, w:0, d:1, l:0, gf:0, ga:0, pts:1 },
      { name: "Uruguay",     gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "Saudi Arabia",gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "Cape Verde",  gp:1, w:0, d:1, l:0, gf:0, ga:0, pts:1 },
    ]
  },
  {
    name: "Group I",
    teams: [
      { name: "France",  gp:1, w:1, d:0, l:0, gf:3, ga:1, pts:3 },
      { name: "Norway",  gp:1, w:1, d:0, l:0, gf:4, ga:1, pts:3 },
      { name: "Senegal", gp:1, w:0, d:0, l:1, gf:1, ga:3, pts:0 },
      { name: "Iraq",    gp:1, w:0, d:0, l:1, gf:1, ga:4, pts:0 },
    ]
  },
  {
    name: "Group J",
    teams: [
      { name: "Argentina", gp:2, w:1, d:0, l:0, gf:3, ga:0, pts:3 },
      { name: "Austria",   gp:2, w:1, d:0, l:0, gf:3, ga:1, pts:3 },
      { name: "Algeria",   gp:2, w:0, d:0, l:1, gf:0, ga:3, pts:0 },
      { name: "Jordan",    gp:2, w:0, d:0, l:1, gf:1, ga:3, pts:0 },
    ]
  },
  {
    name: "Group K",
    teams: [
      { name: "Colombia", gp:1, w:1, d:0, l:0, gf:3, ga:1, pts:3 },
      { name: "Portugal", gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "DR Congo", gp:1, w:0, d:1, l:0, gf:1, ga:1, pts:1 },
      { name: "Uzbekistan",gp:1, w:0, d:0, l:1, gf:1, ga:3, pts:0 },
    ]
  },
  {
    name: "Group L",
    teams: [
      { name: "England", gp:1, w:1, d:0, l:0, gf:4, ga:2, pts:3 },
      { name: "Ghana",   gp:1, w:1, d:0, l:0, gf:1, ga:0, pts:3 },
      { name: "Croatia", gp:1, w:0, d:0, l:1, gf:2, ga:4, pts:0 },
      { name: "Panama",  gp:1, w:0, d:0, l:1, gf:0, ga:1, pts:0 },
    ]
  },
];
