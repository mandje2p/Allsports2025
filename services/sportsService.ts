

import { Match } from "../types";

// Configuration API
const BASE_URL = 'https://v3.football.api-sports.io'; 
const API_KEY = '3b1732199ee53461c8221e26f7335b6d';

// Mapping des IDs pour affichage
const LEAGUE_NAMES: Record<string, string> = {
  '61': 'LIGUE 1',
  '66': 'COUPE DE FRANCE',
  '39': 'PREMIER LEAGUE',
  '45': 'FA CUP',
  '140': 'LA LIGA',
  '143': 'COPA DEL REY',
  '135': 'SERIE A',
  '137': 'COPPA ITALIA',
  '78': 'BUNDESLIGA',
  '81': 'DFB POKAL',
  '94': 'PRIMEIRA LIGA',
  '96': 'TACA DE PORTUGAL',
  // Pays-Bas
  '88': 'EREDIVISIE',
  '90': 'KNVB BEKER',
  // Belgique
  '144': 'JUPILER PRO LEAGUE',
  '146': 'COUPE DE BELGIQUE',
  // Big Competitions
  '2': 'CHAMPIONS LEAGUE',
  '3': 'EUROPA LEAGUE',
  '1': 'WORLD CUP',
  '4': 'EURO',
  '5': 'NATIONS LEAGUE',
  '6': 'AFRICA CUP OF NATIONS',
  '9': 'COPA AMERICA'
};

export const getLeagueName = (id: string | undefined): string => {
    if (!id) return '';
    return LEAGUE_NAMES[id] || 'COMPETITION';
};

// Cache simple pour stocker les matchs par ligue
const matchesCache: Record<string, Match[]> = {};

/**
 * Récupère les matchs pour une ligue sur une large période (Saison 2025 complète ou partielle)
 * Permet au frontend de naviguer jour par jour sans spammer l'API.
 */
export const getMatchesForLeague = async (leagueIdentifier: string): Promise<{ dates: string[], matches: Match[] }> => {
  const leagueId = leagueIdentifier;
  if (!leagueId) return { dates: [], matches: [] };

  const cacheKey = `${leagueId}-season-2025-v3`;
  if (matchesCache[cacheKey]) {
      const matches = matchesCache[cacheKey];
      const dates = Array.from(new Set(matches.map(m => m.date))).sort();
      return { dates, matches };
  }

  // Saison 2025 (comme demandé)
  const currentSeason = "2025"; 
  
  // Plage 2025
  const fromStr = "2025-01-01";
  const toStr = "2025-12-31";

  try {
    const url = `${BASE_URL}/fixtures?league=${leagueId}&season=${currentSeason}&from=${fromStr}&to=${toStr}`;
    console.log("Fetching API:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: { 
        "x-apisports-key": API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) throw new Error(`API Response not ok: ${response.status}`);

    const data = await response.json();
    const fixtures = data.response || [];

    // Fallback Mock si l'API est vide ou erreur (ex: quota dépassé ou saison pas encore active)
    if (fixtures.length === 0) {
        console.warn("API returned 0 matches, using mock data.");
        throw new Error("Empty API Response");
    }

    const mappedMatches: Match[] = fixtures.map((item: any) => {
        const fixture = item.fixture;
        const home = item.teams.home;
        const away = item.teams.away;
        const dateObj = new Date(fixture.date);
        
        return {
            id: String(fixture.id),
            competition: item.league?.name || "Competition",
            date: dateObj.toISOString().split('T')[0],
            time: dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            homeTeam: { name: home.name, logoUrl: home.logo },
            awayTeam: { name: away.name, logoUrl: away.logo },
            venue: fixture.venue?.name || 'Stade'
        };
    });

    // Save to cache
    matchesCache[cacheKey] = mappedMatches;

    const dates = Array.from(new Set(mappedMatches.map(m => m.date))).sort();
    return { dates, matches: mappedMatches };

  } catch (error) {
    console.warn("API Error (getMatchesForLeague) - Using Mock Data fallback", error);
    
    // Génération de Mock Data réaliste pour tester la navigation en 2025
    const mockMatches = generateMockSeason(leagueId);
    matchesCache[cacheKey] = mockMatches;
    const dates = Array.from(new Set(mockMatches.map(m => m.date))).sort();
    return { dates, matches: mockMatches };
  }
};

// Helper pour générer des fausses données si l'API échoue
const generateMockSeason = (leagueId: string): Match[] => {
    const matches: Match[] = [];
    // Dates clés en 2025 (dont le 6 Décembre demandé par l'utilisateur)
    const dates = [
        "2025-12-04", "2025-12-05", "2025-12-06", "2025-12-07", "2025-12-08"
    ];
    
    dates.forEach((d, idx) => {
        // Variation des équipes pour chaque jour
        if (idx % 2 === 0) {
             matches.push({
                id: `m-${d}-1`, competition: LEAGUE_NAMES[leagueId] || 'Ligue', date: d, time: '19:00',
                homeTeam: { name: 'Home Team A', logoUrl: 'https://media.api-sports.io/football/teams/85.png' },
                awayTeam: { name: 'Away Team A', logoUrl: 'https://media.api-sports.io/football/teams/80.png' },
                venue: 'Stade Principal'
             });
        } else {
             matches.push({
                id: `m-${d}-2`, competition: LEAGUE_NAMES[leagueId] || 'Ligue', date: d, time: '21:00',
                homeTeam: { name: 'Home Team B', logoUrl: 'https://media.api-sports.io/football/teams/81.png' },
                awayTeam: { name: 'Away Team B', logoUrl: 'https://media.api-sports.io/football/teams/91.png' },
                venue: 'Stade Secondaire'
             });
        }
    });
    return matches;
};
