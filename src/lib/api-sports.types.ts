/**
 * Definições de tipos para a API-Sports (Football Data)
 * Baseado na documentação oficial: https://www.api-football.com/documentation-v3
 */

export interface ApiSportsLeague {
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
  };
  country: {
    name: string;
    code: string | null;
    flag: string | null;
  };
  seasons: {
    year: number;
    start: string;
    end: string;
    current: boolean;
    coverage: any;
  }[];
}

export interface ApiSportsFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number | null;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: ApiSportsTeam;
    away: ApiSportsTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface ApiSportsTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface ApiSportsOdd {
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number };
  fixture: { id: number; timezone: string; date: string; timestamp: number };
  update: string;
  bookmakers: {
    id: number;
    name: string;
    bets: {
      id: number;
      name: string;
      values: {
        value: string | number;
        odd: string;
      }[];
    }[];
  }[];
}

export interface ApiSportsFixtureStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: {
    type: string;
    value: number | string | null;
  }[];
}

export interface ApiSportsResponse<T> {
  get: string;
  parameters: any;
  errors: any[] | Record<string, string>;
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T[];
}
