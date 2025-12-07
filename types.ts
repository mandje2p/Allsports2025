
export interface User {
  email: string;
  name?: string;
}

export enum SportType {
  FOOTBALL = 'Football',
  BASKETBALL = 'Basket',
  FIGHTING = 'Fighting',
  TENNIS = 'Tennis'
}

export interface Competition {
  id: string;
  name: string;
  logoColor: string;
  accentColor: string;
}

export interface Match {
  id: string;
  competition: string;
  date: string; // ISO String YYYY-MM-DD
  time: string; // HH:mm
  homeTeam: {
    name: string;
    logoUrl?: string;
  };
  awayTeam: {
    name: string;
    logoUrl?: string;
  };
  venue?: string;
}

export interface PosterConfig {
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
}
