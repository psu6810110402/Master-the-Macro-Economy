export type MarketAssetType = 'STOCK' | 'BOND' | 'CRYPTO' | 'COMMODITY' | 'REAL_ESTATE';
export type AssetType = MarketAssetType | 'CASH';

export interface GameState {
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
}

export interface Player {
  id: string;
  displayName: string;
  role: string;
}
