import { GameState, Player } from './types/Game.js';
import { MARKET_EVENTS } from './market.js';

export class GameEngine {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  getState(): GameState {
    return this.state;
  }

  updateStatus(status: GameState['status']) {
    this.state.status = status;
    this.state.isPaused = status === 'PAUSED';
  }

  nextRound() {
    this.state.currentRound += 1;
    this.state.status = 'ACTIVE';
    this.state.readyPlayers = [];
    this.state.newsAckPlayers = [];
    this.state.timer = 0;
  }

  updatePrices(prices: Record<string, number>) {
    this.state.assetPrices = { ...this.state.assetPrices, ...prices };
  }

  getPrice(symbol: string): number {
    return this.state.assetPrices[symbol] || 0;
  }

  addPlayer(player: Player) {
    if (!this.state.players.find(p => p.id === player.id)) {
      this.state.players.push(player);
    }
  }

  processTrade(userId: string, trade: any) {
    // Engine-level trade processing logic (if any)
    console.log(`Trade received from ${userId}:`, trade);
  }

  setTimer(seconds: number) {
    this.state.timer = seconds;
  }

  decrementTimer(): number {
    if (this.state.timer && this.state.timer > 0) {
      this.state.timer -= 1;
    }
    return this.state.timer || 0;
  }

  setPlayerReady(userId: string, isReady: boolean) {
    const player = this.state.players.find(p => p.id === userId);
    if (player) {
      player.isReady = isReady;
    }
    
    if (isReady && !this.state.readyPlayers.includes(userId)) {
      this.state.readyPlayers.push(userId);
    } else if (!isReady) {
      this.state.readyPlayers = this.state.readyPlayers.filter(id => id !== userId);
    }
  }

  isEveryoneReady(): boolean {
    const activePlayers = this.state.players.filter(p => p.role === 'PLAYER');
    if (activePlayers.length === 0) return false;
    return activePlayers.every(p => this.state.readyPlayers.includes(p.id));
  }

  setPlayerNewsAck(userId: string, ack: boolean) {
    if (ack && !this.state.newsAckPlayers.includes(userId)) {
      this.state.newsAckPlayers.push(userId);
    } else if (!ack) {
      this.state.newsAckPlayers = this.state.newsAckPlayers.filter(id => id !== userId);
    }
  }

  isEveryoneNewsAcked(): boolean {
    const players = this.state.players.filter(p => p.role === 'PLAYER');
    if (players.length === 0) return true;
    return players.every(p => this.state.newsAckPlayers.includes(p.id));
  }

  applyMarketEvent(eventId: string, assetTypes: Record<string, any>, basePrices: Record<string, number>, noise: number = 0.05) {
    const event = MARKET_EVENTS.find(e => e.id === eventId);
    if (!event) return;

    this.state.lastEvent = {
        id: event.id,
        headline: event.headline,
        description: event.description,
    };

    const newPrices = { ...this.state.assetPrices };

    for (const [symbol, type] of Object.entries(assetTypes)) {
      const basePrice = basePrices[symbol] || 100;
      const currentPrice = this.state.assetPrices[symbol] || basePrice;
      
      let impact = 0;
      if (event.impact[type as keyof typeof event.impact]) {
        impact = event.impact[type as keyof typeof event.impact] as number;
      }

      const randomNoise = (Math.random() - 0.5) * noise;
      const totalChange = impact + randomNoise;
      
      newPrices[symbol] = Math.max(0.01, currentPrice * (1 + totalChange));
    }

    this.state.assetPrices = newPrices;
  }
}
