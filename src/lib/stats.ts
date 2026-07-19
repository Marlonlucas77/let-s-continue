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
  bttsPct: number;
  over25Pct: number;
  over15Pct: number;
  over35Pct: number;
  form: ("W" | "D" | "L")[];
}

export function computeTeamStats(teamId: string, matches: Match[], filter: "all" | "home" | "away" = "all"): TeamStats {
  const rel = matches.filter((m) => {
    if (filter === "home") return m.home_team_id === teamId;
    if (filter === "away") return m.away_team_id === teamId;
    return m.home_team_id === teamId || m.away_team_id === teamId;
  });

  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, corners = 0, yellow = 0, btts = 0, o15 = 0, o25 = 0, o35 = 0;
  const form: ("W" | "D" | "L")[] = [];

  const sorted = [...rel].sort((a, b) => b.match_date.localeCompare(a.match_date));

  for (const m of sorted) {
    const isHome = m.home_team_id === teamId;
    const my = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
    const opp = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
    gf += my; ga += opp;
    corners += (isHome ? m.home_corners : m.away_corners) ?? 0;
    yellow += (isHome ? m.home_yellow : m.away_yellow) ?? 0;
    if ((m.home_goals ?? 0) > 0 && (m.away_goals ?? 0) > 0) btts++;
    const tot = (m.home_goals ?? 0) + (m.away_goals ?? 0);
    if (tot > 1.5) o15++;
    if (tot > 2.5) o25++;
    if (tot > 3.5) o35++;
    let r: "W" | "D" | "L" = "D";
    if (my > opp) { wins++; r = "W"; }
    else if (my < opp) { losses++; r = "L"; }
    else draws++;
    if (form.length < 10) form.push(r);
  }

  const n = rel.length || 1;
  return {
    games: rel.length, wins, draws, losses, goalsFor: gf, goalsAgainst: ga,
    avgGoalsFor: gf / n, avgGoalsAgainst: ga / n, avgCorners: corners / n, avgYellow: yellow / n,
    bttsPct: (btts / n) * 100, over15Pct: (o15 / n) * 100, over25Pct: (o25 / n) * 100, over35Pct: (o35 / n) * 100,
    form,
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
  basis: string;
}

export function generatePrediction(homeId: string, awayId: string, matches: Match[]): Prediction {
  const homeHome = computeTeamStats(homeId, matches, "home");
  const awayAway = computeTeamStats(awayId, matches, "away");
  const homeAll = computeTeamStats(homeId, matches, "all");
  const awayAll = computeTeamStats(awayId, matches, "all");

  const homeAttack = (homeHome.avgGoalsFor * 0.6 + homeAll.avgGoalsFor * 0.4) || 1.2;
  const awayAttack = (awayAway.avgGoalsFor * 0.6 + awayAll.avgGoalsFor * 0.4) || 1.0;
  const homeDef = (homeHome.avgGoalsAgainst * 0.6 + homeAll.avgGoalsAgainst * 0.4) || 1.0;
  const awayDef = (awayAway.avgGoalsAgainst * 0.6 + awayAll.avgGoalsAgainst * 0.4) || 1.2;

  const homeExp = (homeAttack + awayDef) / 2 + 0.15;
  const awayExp = (awayAttack + homeDef) / 2;
  const expectedGoals = homeExp + awayExp;

  const formScore = (form: ("W" | "D" | "L")[]) => form.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / (form.length * 3 || 1);
  const hf = formScore(homeAll.form);
  const af = formScore(awayAll.form);

  const rawHome = homeExp + hf * 0.5;
  const rawAway = awayExp + af * 0.5;
  const rawDraw = Math.max(0.5, 1.5 - Math.abs(rawHome - rawAway));
  const sum = rawHome + rawAway + rawDraw;

  const bttsPct = (homeAll.bttsPct + awayAll.bttsPct) / 2;
  const over25Pct = expectedGoals > 2.5 ? Math.min(85, 50 + (expectedGoals - 2.5) * 20) : Math.max(15, 50 - (2.5 - expectedGoals) * 20);

  const cornersAvg = ((homeAll.avgCorners || 5) + (awayAll.avgCorners || 5));
  const yellowAvg = ((homeAll.avgYellow || 2) + (awayAll.avgYellow || 2));

  return {
    homeWinPct: Math.round((rawHome / sum) * 100),
    drawPct: Math.round((rawDraw / sum) * 100),
    awayWinPct: Math.round((rawAway / sum) * 100),
    expectedGoals: Math.round(expectedGoals * 10) / 10,
    over25Pct: Math.round(over25Pct),
    bttsPct: Math.round(bttsPct),
    expectedCornersMin: Math.max(4, Math.floor(cornersAvg - 2)),
    expectedCornersMax: Math.ceil(cornersAvg + 2),
    expectedYellow: Math.round(yellowAvg),
    basis: `Baseado em ${homeAll.games} jogos do mandante e ${awayAll.games} do visitante. Forma recente e vantagem de mando consideradas.`,
  };
}

export function teamInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
