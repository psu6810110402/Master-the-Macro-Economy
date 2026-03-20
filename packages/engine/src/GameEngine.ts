import { GameState, Player, AssetType, MarketAssetType } from './types/Game.js';
import { MARKET_EVENTS, MarketEvent } from './market.js';

export class GameEngine {
  private state: GameState;

  constructor(initialState?: GameState) {
    this.state = initialState || {
      players: [],
      currentRound: 1,
      isPaused: false,
      status: 'WAITING',
      assetPrices: {},
    };
  }

  public addPlayer(player: Player): void {
    const exists = this.state.players.find(p => p.id === player.id);
    if (!exists) {
      this.state.players.push(player);
    }
  }

  public setPrices(prices: Record<string, number>): void {
    this.state.assetPrices = { ...this.state.assetPrices, ...prices };
  }

  /**
   * Applies a specific market event to the current asset prices.
   * New Price = Base Price * (1 + Event Impact + Noise)
   * Note: Per GDD, we use a fresh $100k and base prices each round for independent scenarios.
   */
  public applyMarketEvent(eventId: string, assetTypes: Record<string, AssetType>, basePrices: Record<string, number>, noiseFactor: number = 0.05): void {
    const event = MARKET_EVENTS.find(e => e.id === eventId);
    if (!event) return;

    const newPrices: Record<string, number> = {};
    
    for (const [symbol, basePrice] of Object.entries(basePrices)) {
      const type = assetTypes[symbol];
      if (!type || type === 'CASH') continue;

      const impact = event.impact[type as MarketAssetType] || 0;
      // Random noise between -noiseFactor and +noiseFactor
      const randomNoise = (Math.random() - 0.5) * 2 * noiseFactor;
      
      const newPrice = basePrice * (1 + impact + randomNoise);
      newPrices[symbol] = Math.max(0.01, Number(newPrice.toFixed(4)));
    }

    this.state.assetPrices = newPrices;
    this.state.lastEvent = {
      id: event.id,
      headline: event.headline,
      description: event.description,
    };
  }

  public getPrice(symbol: string): number {
    return this.state.assetPrices[symbol] || 0;
  }

  public validateTrade(playerId: string, trade: { symbol: string, quantity: number, action: 'BUY' | 'SELL' }): boolean {
    const price = this.getPrice(trade.symbol);
    if (price <= 0) return false;
    if (trade.quantity <= 0) return false;
    return true;
  }

  public processTrade(playerId: string, tradeData: any): void {
    console.log(`Processing trade for ${playerId}:`, tradeData);
  }

  public updateStatus(status: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'NEWS_BREAK'): void {
    this.state.status = status;
    this.state.isPaused = (status === 'PAUSED');
  }

  public nextRound(): void {
    this.state.currentRound++;
    this.state.status = 'ACTIVE';
    this.state.isPaused = false;
  }

  public getState(): GameState {
    return this.state;
  }
}
