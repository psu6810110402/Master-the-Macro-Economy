import { Injectable, Logger } from '@nestjs/common';
import { GameEngine, MARKET_EVENTS, SCENARIOS } from '@hackanomics/engine';
import { AssetType } from '@hackanomics/engine/dist/types/Game';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  // Default base prices per GDD if not in DB
  private readonly basePrices: Record<string, number> = {
    'AAPL': 180,
    'MSFT': 415,
    'TLT': 95,
    'BTC': 65000,
    'ETH': 3200,
    'GOLD': 2300,
    'OIL': 85,
    'VNQ': 85,
  };

  /**
   * Returns the base price for a given symbol, used as fallback.
   */
  getBasePrice(symbol: string): number {
    return this.basePrices[symbol] || 100;
  }

  /**
   * Updates the game engine with new prices based on the selected Scenario arc.
   */
  async updateMarket(engine: GameEngine, assetTypes: Record<string, string>) {
    const state = engine.getState();
    const scenarioId = state.scenarioId || 'TECH_CRISIS';
    const currentRound = state.currentRound || 1;

    // 1. Find the scenario and the specific event for this round
    const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];
    
    // Map round number to event index (Round 1 => index 0)
    const eventIndex = Math.min(Math.max(0, currentRound - 1), scenario.events.length - 1);
    const eventId = scenario.events[eventIndex];
    
    const event = MARKET_EVENTS.find(e => e.id === eventId);
    
    if (!event) {
      this.logger.error(`Event ${eventId} not found for scenario ${scenario.name}`);
      return state.assetPrices;
    }

    // 2. Apply Event
    // We pass assetTypes as Record<string, AssetType> and basePrices
    engine.applyMarketEvent(
      event.id, 
      assetTypes as Record<string, any>, 
      this.basePrices,
      0.05 // 5% noise factor per GDD
    );
    
    const updatedState = engine.getState();
    this.logger.log(`Market update (Scenario: ${scenario.name}, Round: ${currentRound}): [${event.id}] - ${event.headline}`);
    return updatedState.assetPrices;
  }
}
