import { Injectable, Logger } from '@nestjs/common';
import { GameEngine } from '@hackanomics/engine';
import { PrismaClient } from '@hackanomics/database';
import { MacroEngineService } from '../macro-engine/macro-engine.service';
import { BlackSwanService, AssetClass } from '../macro-engine/black-swan.service';

const prisma = new PrismaClient();

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private macroEngine: MacroEngineService,
    private blackSwan: BlackSwanService,
  ) {}

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

  getBasePrice(symbol: string): number {
    return this.basePrices[symbol] || 100;
  }

  /**
   * Updates the game engine with new prices based on advanced Macro Engine logic.
   */
  async updateMarket(engine: GameEngine, assetTypes: Record<string, string>) {
    const state = engine.getState();
    const sessionId = state.sessionId;
    const currentRound = state.currentRound;

    if (!sessionId) {
        this.logger.error('Session ID is missing from engine state.');
        return state.assetPrices;
    }

    // 1. Get current Macro State
    let macro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: currentRound } },
    });

    if (!macro) {
      this.logger.warn(`No macro state found for session ${sessionId} round ${currentRound}. Creating default.`);
      macro = await prisma.macroState.create({
        data: {
          sessionId,
          roundNumber: currentRound,
          interestRate: 2.5,
          inflation: 3.0,
          gdpGrowth: 2.8,
        },
      });
    }

    // 2. Determine if a Black Swan occurs
    let activeBlackSwan = null;
    if (macro.blackSwanActive && macro.blackSwanEvent) {
      activeBlackSwan = this.blackSwan.getEventByName(macro.blackSwanEvent);
    }

    const newPrices: Record<string, number> = {};
    const assets = await prisma.asset.findMany({ where: { isActive: true } });

    // 3. Calculate next price for each asset
    for (const asset of assets) {
      const currentPrice = state.assetPrices[asset.symbol] || this.getBasePrice(asset.symbol);
      
      const sensitivity = this.macroEngine.getSensitivity(asset.symbol, asset.type);
      
      const { nextPrice, delta } = this.macroEngine.calculateNextPrice(
        currentPrice,
        sensitivity,
        macro.interestRate,
        macro.inflation,
        macro.gdpGrowth,
        macro.volatility
      );

      let finalizedPrice = nextPrice;
      let finalizedDelta = delta;

      // 4. Apply Black Swan shock if applicable
      if (activeBlackSwan) {
        const assetClass = this.mapAssetToClass(asset.symbol, asset.type);
        const shock = activeBlackSwan.shocks[assetClass as AssetClass];
        if (shock) {
          finalizedPrice = finalizedPrice * (1 + shock);
          finalizedDelta = ((finalizedPrice - currentPrice) / currentPrice) * 100;
        }
      }

      newPrices[asset.symbol] = Math.max(0.01, finalizedPrice);

      // 5. Log the price change to DB
      await prisma.assetPrice.create({
        data: {
          assetId: asset.id,
          price: newPrices[asset.symbol],
          delta: finalizedDelta,
          sessionId,
          roundNumber: currentRound,
        },
      });
    }

    // 6. Update engine state
    engine.updatePrices(newPrices);
    return newPrices;
  }

  private mapAssetToClass(symbol: string, type: string): AssetClass {
    if (symbol === 'GOLD' || ['SILVER', 'PLAT', 'COPP'].includes(symbol)) return 'GOLD';
    if (symbol === 'BTC' || symbol === 'ETH' || ['SOL', 'BNB', 'XRP'].includes(symbol)) return 'CRYPTO';
    if (type === 'BOND') return 'BOND';
    if (['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'TSLA'].includes(symbol)) return 'TECH';
    if (['CAT', 'GE', 'HON', 'BA', 'XOM', 'CVX', 'OIL'].includes(symbol)) return 'INDUSTRIAL';
    if (type === 'REAL_ESTATE' || symbol === 'VNQ') return 'CONSUMER';
    return 'TECH';
  }
}
