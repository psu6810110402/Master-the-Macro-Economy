export type MarketAssetType = 'STOCK' | 'BOND' | 'CRYPTO' | 'COMMODITY' | 'REAL_ESTATE';
export type AssetType = MarketAssetType | 'CASH';

export interface GameState {
  sessionId?: string;
  players: Player[];
  currentRound: number;
  isPaused: boolean;
  status: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'NEWS_BREAK';
  scenarioId?: string;
  assetPrices: Record<string, number>;
  lastEvent?: {
    id: string;
    headline: string;
    description: string;
  };
  timer?: number; // seconds remaining
  readyPlayers: string[]; // array of player IDs who submitted 'ready'
  newsAckPlayers: string[]; // array of player IDs who acknowledged the news
}

export interface Player {
  id: string;
  displayName: string;
  role: string;
  isReady?: boolean;
}
