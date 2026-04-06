import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '../../prisma';

export interface AssetSensitivity {
  r: number;   // Interest Rate sensitivity
  pi: number;  // Inflation sensitivity
  g: number;   // GDP Growth sensitivity
}

@Injectable()
export class MacroEngineService {
  private readonly logger = new Logger(MacroEngineService.name);

  // Default sensitivities by asset type (fallback when DB values are all 0)
  private readonly typeFallback: Record<string, AssetSensitivity> = {
    'STOCK':       { r: -1.8, pi: -0.5, g: 1.8 },
    'CRYPTO':      { r: -5.0, pi: 1.5,  g: 2.0 },
    'BOND':        { r: 4.5,  pi: -3.0, g: -1.0 },
    'COMMODITY':   { r: -1.0, pi: 2.8,  g: -0.5 },
    'REAL_ESTATE': { r: -3.5, pi: 2.5,  g: 1.5 },
  };

  /**
   * DB-first sensitivity lookup: reads per-asset values from the Asset table.
   * Falls back to type-based defaults if DB values are all zero.
   */
  public async getSensitivityFromDB(symbol: string, type: string): Promise<AssetSensitivity> {
    try {
      const asset = await prisma.asset.findUnique({ where: { symbol } });
      if (asset && (asset.irSensitivity !== 0 || asset.infSensitivity !== 0 || asset.gdpSensitivity !== 0)) {
        return {
          r: asset.irSensitivity,
          pi: asset.infSensitivity,
          g: asset.gdpSensitivity,
        };
      }
    } catch (err) {
      this.logger.warn(`DB sensitivity lookup failed for ${symbol}, using type fallback`);
    }
    return this.typeFallback[type] || this.typeFallback['STOCK'];
  }

  /** Sync fallback — uses type-based defaults only (for callers that can't await) */
  public getSensitivity(_symbol: string, type: string): AssetSensitivity {
    return this.typeFallback[type] || this.typeFallback['STOCK'];
  }

  /**
   * Core Calculator: Asset Price (next round) = Base Price × (1 + Σ weighted_factors)
   */
  calculateNextPrice(
    currentPrice: number,
    sensitivity: AssetSensitivity,
    rDelta: number, // interest rate delta (%)
    pi: number,     // inflation rate (%)
    g: number,      // GDP growth (%)
    volatility: number = 0.3
  ): { nextPrice: number; delta: number } {
    const deterministic =
      sensitivity.r  * (rDelta / 100) +
      sensitivity.pi * (pi / 100) +
      sensitivity.g  * (g / 100);

    const noise = (Math.random() - 0.5) * volatility * 2;
    const rawReturn = deterministic + (noise / 10); 

    // Cap return at ±40% per spec
    const capped = Math.max(-0.40, Math.min(0.40, rawReturn));

    return {
      nextPrice: currentPrice * (1 + capped),
      delta: capped * 100,
    };
  }

  async getLatestMacroState(sessionId: string) {
    return prisma.macroState.findFirst({
      where: { sessionId },
      orderBy: { roundNumber: 'desc' },
    });
  }

  async createInitialMacroState(sessionId: string) {
    return prisma.macroState.create({
      data: {
        sessionId,
        roundNumber: 0,
        interestRate: 2.5,
        inflation: 3.0,
        gdpGrowth: 2.8,
        volatility: 0.3,
      },
    });
  }
}
