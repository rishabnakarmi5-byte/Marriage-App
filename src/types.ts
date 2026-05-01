export type PlayerScore = {
  maal: number;
  seen: boolean;
  winner: boolean;
  points: number;
  details?: {
    gamePoints: number;
    maalPoints: number;
  };
};

export type MatchData = {
  id?: string;
  matchNumber: number;
  type: 'normal' | 'dubli';
  isFault: boolean;
  faultPlayerId: string | null;
  scores: Record<string, PlayerScore>;
  createdAt: number;
  updatedAt: number;
};

export type GameRules = {
  rate: number;
  normalSeen: number;
  normalUnseen: number;
  dubliSeen: number;
  dubliUnseen: number;
  faultNormal: number;
  faultDubli: number;
  cancelMaalOnFault: boolean;
};

export type GameData = {
  id?: string;
  ownerId: string;
  status: 'waiting' | 'playing' | 'completed';
  playerIds: string[];
  players: Record<string, { name: string; totalScore: number }>;
  currentMatch: number;
  rules: GameRules;
  isDemo?: boolean;
  exitRequests?: string[]; // IDs of players who want to quit
  matchCount?: number;
  lastWinnerId?: string | null;
  createdAt: number;
  updatedAt: number;
};
