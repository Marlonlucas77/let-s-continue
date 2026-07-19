// Traduções de países (API-Sports usa nomes em inglês) para pt-BR
const MAP: Record<string, string> = {
  "World": "Mundo",
  "England": "Inglaterra",
  "Spain": "Espanha",
  "Germany": "Alemanha",
  "Italy": "Itália",
  "France": "França",
  "Portugal": "Portugal",
  "Netherlands": "Holanda",
  "Belgium": "Bélgica",
  "Scotland": "Escócia",
  "Wales": "País de Gales",
  "Ireland": "Irlanda",
  "Northern-Ireland": "Irlanda do Norte",
  "Switzerland": "Suíça",
  "Austria": "Áustria",
  "Turkey": "Turquia",
  "Greece": "Grécia",
  "Russia": "Rússia",
  "Ukraine": "Ucrânia",
  "Poland": "Polônia",
  "Czech-Republic": "República Tcheca",
  "Denmark": "Dinamarca",
  "Sweden": "Suécia",
  "Norway": "Noruega",
  "Finland": "Finlândia",
  "Iceland": "Islândia",
  "Croatia": "Croácia",
  "Serbia": "Sérvia",
  "Romania": "Romênia",
  "Hungary": "Hungria",
  "Bulgaria": "Bulgária",
  "Slovakia": "Eslováquia",
  "Slovenia": "Eslovênia",
  "Argentina": "Argentina",
  "Brazil": "Brasil",
  "Chile": "Chile",
  "Colombia": "Colômbia",
  "Uruguay": "Uruguai",
  "Paraguay": "Paraguai",
  "Peru": "Peru",
  "Ecuador": "Equador",
  "Bolivia": "Bolívia",
  "Venezuela": "Venezuela",
  "Mexico": "México",
  "USA": "Estados Unidos",
  "United-States": "Estados Unidos",
  "Canada": "Canadá",
  "Japan": "Japão",
  "South-Korea": "Coreia do Sul",
  "China": "China",
  "Australia": "Austrália",
  "Saudi-Arabia": "Arábia Saudita",
  "United-Arab-Emirates": "Emirados Árabes Unidos",
  "Qatar": "Catar",
  "Egypt": "Egito",
  "Morocco": "Marrocos",
  "Tunisia": "Tunísia",
  "Algeria": "Argélia",
  "South-Africa": "África do Sul",
  "Nigeria": "Nigéria",
  "Ghana": "Gana",
  "Ivory-Coast": "Costa do Marfim",
  "Senegal": "Senegal",
  "Cameroon": "Camarões",
};

const LEAGUE_MAP: Record<string, string> = {
  "Premier League": "Premier League",
  "La Liga": "La Liga",
  "Serie A": "Serie A",
  "Bundesliga": "Bundesliga",
  "Ligue 1": "Ligue 1",
  "Primeira Liga": "Primeira Liga",
  "Eredivisie": "Eredivisie",
  "Championship": "Championship",
  "UEFA Champions League": "Liga dos Campeões",
  "UEFA Europa League": "Liga Europa",
  "UEFA Europa Conference League": "Liga Conferência",
  "UEFA Nations League": "Liga das Nações",
  "Copa Libertadores": "Copa Libertadores",
  "Copa Sudamericana": "Copa Sul-Americana",
  "CONMEBOL Libertadores": "Copa Libertadores",
  "CONMEBOL Sudamericana": "Copa Sul-Americana",
  "World Cup": "Copa do Mundo",
  "World Cup - Qualification South America": "Eliminatórias da Copa - América do Sul",
  "World Cup - Qualification Europe": "Eliminatórias da Copa - Europa",
  "World Cup - Qualification Africa": "Eliminatórias da Copa - África",
  "World Cup - Qualification Asia": "Eliminatórias da Copa - Ásia",
  "World Cup - Qualification CONCACAF": "Eliminatórias da Copa - CONCACAF",
  "Friendlies": "Amistosos",
  "Friendlies Clubs": "Amistosos de Clubes",
  "Copa America": "Copa América",
  "Euro Championship": "Eurocopa",
  "Africa Cup of Nations": "Copa Africana de Nações",
  "Copa do Brasil": "Copa do Brasil",
  "Serie B": "Série B",
  "Serie C": "Série C",
  "Serie D": "Série D",
};

export function translateCountry(name?: string | null): string {
  if (!name) return "";
  return MAP[name] ?? name;
}

export function translateLeague(name?: string | null): string {
  if (!name) return "";
  return LEAGUE_MAP[name] ?? name;
}

// Nomes de seleções (times = nome do país na API-Sports) traduzidos.
// Clubes mantêm o nome original — são nomes próprios.
export function translateTeam(name?: string | null): string {
  if (!name) return "";
  return MAP[name] ?? name;
}

