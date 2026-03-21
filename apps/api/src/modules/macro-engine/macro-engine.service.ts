import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@hackanomics/database';

const prisma = new PrismaClient();

export interface AssetSensitivity {
  r: number;   // Interest Rate sensitivity
  pi: number;  // Inflation sensitivity
  g: number;   // GDP Growth sensitivity
}

@Injectable()
export class MacroEngineService {
  private readonly logger = new Logger(MacroEngineService.name);

  // High-Fidelity Impact Matrix: r (Rates), pi (Inflation), g (GDP)
  private readonly sensitivityMatrix: Record<string, AssetSensitivity> = {
    'TECH_GROWTH':    { r: -3.2, pi: -1.8, g: 3.5 }, // High growth, sensitive to rates
    'TECH_STALWART':  { r: -1.8, pi: -0.5, g: 1.8 }, // Big tech, more resilient
    'FINANCE':        { r: 2.5,  pi: 0.5,  g: 1.2 }, // Benefits from rates
    'ENERGY':         { r: -0.5, pi: 3.5,  g: 1.0 }, // Inflation hedge (Oil/Gas)
    'HEALTHCARE':     { r: -0.8, pi: -0.2, g: 0.5 }, // Defensive
    'CONSUMER_STAP':  { r: -0.5, pi: 1.2,  g: 0.3 }, // Defensive (Food/Bev)
    'CONSUMER_DISC':  { r: -2.0, pi: -1.0, g: 2.5 }, // Cyclical
    'INDUSTRIAL':     { r: -1.5, pi: 1.0,  g: 2.2 }, // Capital intensive
    'UTILITIES':      { r: -2.5, pi: 0.8,  g: 0.2 }, // Rate sensitive, defensive
    'REIT_RES':       { r: -3.5, pi: 2.5,  g: 1.5 }, // High debt, inflation hedge
    'BOND_LONG':      { r: 4.5,  pi: -3.0, g: -1.0 },
    'CRYPTO_ALT':     { r: -5.0, pi: 1.5,  g: 2.0 },
    'COMMODITY_MET':  { r: -1.0, pi: 2.8,  g: -0.5 }, // Gold/Silver
  };

  public getSensitivity(symbol: string, type: string): AssetSensitivity {
    // Map individual assets to their sector sensitivity
    const sectorMap: Record<string, string> = {
      // Tech
      'AAPL': 'TECH_STALWART', 'MSFT': 'TECH_STALWART', 'NVDA': 'TECH_GROWTH', 'TSLA': 'TECH_GROWTH',
      // Finance
      'JPM': 'FINANCE', 'GS': 'FINANCE', 'V': 'FINANCE',
      // Energy
      'XOM': 'ENERGY', 'CVX': 'ENERGY', 'BP': 'ENERGY', 'OIL': 'ENERGY',
      // Consumer
      'PG': 'CONSUMER_STAP', 'KO': 'CONSUMER_STAP', 'AMZN': 'CONSUMER_DISC', 'NKE': 'CONSUMER_DISC',
      // Bonds/Commodities
      'TLT': 'BOND_LONG', 'GOLD': 'COMMODITY_MET', 'BTC': 'CRYPTO_ALT', 'ETH': 'CRYPTO_ALT',
      'VNQ': 'REIT_RES',
    };

    const sectorId = sectorMap[symbol];
    if (sectorId && this.sensitivityMatrix[sectorId]) {
      return this.sensitivityMatrix[sectorId];
    }

    // Dynamic Fallback based on type
    if (type === 'CRYPTO') return this.sensitivityMatrix['CRYPTO_ALT'];
    if (type === 'BOND') return this.sensitivityMatrix['BOND_LONG'];
    if (type === 'COMMODITY') return this.sensitivityMatrix['ENERGY'];
    
    return this.sensitivityMatrix['TECH_STALWART'];
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
