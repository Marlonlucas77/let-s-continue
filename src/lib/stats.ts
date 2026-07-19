import type { Database } from "@/integrations/supabase/types";

export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];

export interface TeamStats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgCorners: number;
  avgYellow: number;
  avgRed: number;
  bttsPct: number;
  over25Pct: number;
  over15Pct: number;
  over35Pct: number;
  csPct: number; // Clean sheet percentage
  failingToScorePct: number;
  form: ("W" | "D" | "L")[];
  formWeights: number[];
  recentGoals: number[];
}

export function computeTeamStats(teamId: string, matches: Match[], filter: "all" | "home" | "away" = "all"): TeamStats {
  const rel = matches.filter((m) => {
    if (filter === "home") return m.home_team_id === teamId;
    if (filter === "away") return m.away_team_id === teamId;
    return m.home_team_id === teamId || m.away_team_id === teamId;
  });

  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, corners = 0, yellow = 0, red = 0;
  let btts = 0, o15 = 0, o25 = 0, o35 = 0, cs = 0, fts = 0;
  const form: ("W" | "D" | "L")[] = [];
  const recentGoals: number[] = [];

  const sorted = [...rel].sort((a, b) => b.match_date.localeCompare(a.match_date));

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const isHome = m.home_team_id === teamId;
    const my = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
    const opp = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
    
    gf += my; ga += opp;
    corners += (isHome ? m.home_corners : m.away_corners) ?? 0;
    yellow += (isHome ? m.home_yellow : m.away_yellow) ?? 0;
    red += (isHome ? m.home_red : m.away_red) ?? 0;
    
    if ((m.home_goals ?? 0) > 0 && (m.away_goals ?? 0) > 0) btts++;
    const tot = (m.home_goals ?? 0) + (m.away_goals ?? 0);
    if (tot > 1.5) o15++;
    if (tot > 2.5) o25++;
    if (tot > 3.5) o35++;
    if (opp === 0) cs++;
    if (my === 0) fts++;
    
    let r: "W" | "D" | "L" = "D";
    if (my > opp) { wins++; r = "W"; }
    else if (my < opp) { losses++; r = "L"; }
    else draws++;
    
    if (form.length < 10) {
      form.push(r);
      recentGoals.push(my);
    }
  }

  const n = rel.length || 1;
  // Pesos para forma recente (mais recente tem mais peso)
  const formWeights = form.map((_, i) => Math.pow(0.9, i));

  return {
    games: rel.length, wins, draws, losses, goalsFor: gf, goalsAgainst: ga,
    avgGoalsFor: gf / n, avgGoalsAgainst: ga / n, avgCorners: corners / n, 
    avgYellow: yellow / n, avgRed: red / n,
    bttsPct: (btts / n) * 100, over15Pct: (o15 / n) * 100, over25Pct: (o25 / n) * 100, over35Pct: (o35 / n) * 100,
    csPct: (cs / n) * 100, failingToScorePct: (fts / n) * 100,
    form, formWeights, recentGoals
  };
}

export interface Prediction {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  expectedGoals: number;
  over25Pct: number;
  bttsPct: number;
  expectedCornersMin: number;
  expectedCornersMax: number;
  expectedYellow: number;
  confidenceScore: number;
  basis: string;
}

/**
 * Distribuição de Poisson para probabilidade de gols
 */
function poisson(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function generatePrediction(homeId: string, awayId: string, matches: Match[]): Prediction {
  const homeHome = computeTeamStats(homeId, matches, "home");
  const awayAway = computeTeamStats(awayId, matches, "away");
  const homeAll = computeTeamStats(homeId, matches, "all");
  const awayAll = computeTeamStats(awayId, matches, "all");

  // Média da liga (fallback)
  const leagueAvgGoals = 1.35;

  // Força de ataque e defesa ajustada por mando de campo
  const hAttackForce = (homeHome.avgGoalsFor / leagueAvgGoals) * 0.7 + (homeAll.avgGoalsFor / leagueAvgGoals) * 0.3;
  const aAttackForce = (awayAway.avgGoalsFor / leagueAvgGoals) * 0.7 + (awayAll.avgGoalsFor / leagueAvgGoals) * 0.3;
  const hDefenseForce = (homeHome.avgGoalsAgainst / leagueAvgGoals) * 0.7 + (homeAll.avgGoalsAgainst / leagueAvgGoals) * 0.3;
  const aDefenseForce = (awayAway.avgGoalsAgainst / leagueAvgGoals) * 0.7 + (awayAll.avgGoalsAgainst / leagueAvgGoals) * 0.3;

  // Gols esperados (xG) baseados na força relativa
  let homeExp = hAttackForce * aDefenseForce * leagueAvgGoals;
  let awayExp = aAttackForce * hDefenseForce * leagueAvgGoals;

  // Ajuste de forma (momentum)
  const calculateMomentum = (stats: TeamStats) => {
    if (stats.form.length === 0) return 1.0;
    const score = stats.form.reduce((acc, r, i) => acc + (r === "W" ? 3 : r === "D" ? 1 : 0) * stats.formWeights[i], 0);
    const max = stats.formWeights.reduce((acc, w) => acc + 3 * w, 0);
    return 0.8 + (score / max) * 0.4; // 0.8 a 1.2
  };

  homeExp *= calculateMomentum(homeAll);
  awayExp *= calculateMomentum(awayAll);

  // Matriz de probabilidades (0 a 5 gols)
  let homeWinProb = 0;
  let awayWinProb = 0;
  let drawProb = 0;
  let over25Prob = 0;
  let bttsProb = 0;

  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob = poisson(h, homeExp) * poisson(a, awayExp);
      if (h > a) homeWinProb += prob;
      else if (h < a) awayWinProb += prob;
      else drawProb += prob;
      
      if (h + a > 2.5) over25Prob += prob;
      if (h > 0 && a > 0) bttsProb += prob;
    }
  }

  const cornersAvg = ((homeAll.avgCorners || 5) + (awayAll.avgCorners || 5));
  const yellowAvg = ((homeAll.avgYellow || 2) + (awayAll.avgYellow || 2));
  
  const confidenceScore = Math.min(100, Math.max(0, 
    (homeAll.games >= 5 && awayAll.games >= 5 ? 20 : 10) +
    (Math.abs(homeWinProb - awayWinProb) * 100 * 0.5) +
    (homeExp + awayExp > 2 ? 10 : 0)
  ));

  return {
    homeWinPct: Math.round(homeWinProb * 100),
    drawPct: Math.round(drawProb * 100),
    awayWinPct: Math.round(awayWinProb * 100),
    expectedGoals: Math.round((homeExp + awayExp) * 10) / 10,
    over25Pct: Math.round(over25Prob * 100),
    bttsPct: Math.round(bttsProb * 100),
    expectedCornersMin: Math.max(4, Math.floor(cornersAvg - 1.5)),
    expectedCornersMax: Math.ceil(cornersAvg + 1.5),
    expectedYellow: Math.round(yellowAvg),
    confidenceScore: Math.round(confidenceScore),
    basis: `Poisson model com momentum. ${homeAll.games + awayAll.games} jogos analisados.`,
  };
}

export function teamInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
