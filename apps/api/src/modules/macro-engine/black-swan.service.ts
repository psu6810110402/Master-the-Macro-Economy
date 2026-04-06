import { Injectable, Logger } from '@nestjs/common';

export type AssetClass = 'TECH' | 'INDUSTRIAL' | 'CONSUMER' | 'BOND' | 'GOLD' | 'CRYPTO' | 'CASH';

export interface BlackSwanEvent {
  name: string;
  tier: 1 | 2 | 3;
  shocks: Partial<Record<AssetClass, number>>; // Immediate impact %
  description: string;
}

@Injectable()
export class BlackSwanService {
  private readonly logger = new Logger(BlackSwanService.name);

  private readonly events: BlackSwanEvent[] = [
    // Tier 1: Shocks (-15% to -25%)
    {
      name: 'Flash Crash',
      tier: 1,
      shocks: { CRYPTO: -0.35, TECH: -0.20 },
      description: 'Algorithm failure triggers a high-speed market sell-off.',
    },
    {
      name: 'Bank Run',
      tier: 1,
      shocks: { BOND: -0.15, CASH: -0.10 },
      description: 'Liquidity concerns spark panic withdrawals.',
    },
    {
      name: 'Supply Chain Crisis',
      tier: 1,
      shocks: { INDUSTRIAL: -0.25, CONSUMER: -0.20 },
      description: 'Logistics bottlenecks halt global manufacturing.',
    },
    {
      name: 'AI Bubble Burst',
      tier: 1,
      shocks: { TECH: -0.25, CRYPTO: -0.15 },
      description: 'Overhyped AI valuations correct sharply as revenue misses.',
    },
    {
      name: 'Regulatory Crackdown',
      tier: 1,
      shocks: { CRYPTO: -0.30, TECH: -0.10 },
      description: 'New government policies restrict digital asset trading.',
    },

    // Tier 2: Crisis (-25% to -40%)
    {
      name: 'Trade War',
      tier: 2,
      shocks: { TECH: -0.35, INDUSTRIAL: -0.30 },
      description: 'Geopolitical tariffs cripple international trade.',
    },
    {
      name: 'Stagflation',
      tier: 2,
      shocks: { BOND: -0.30, CASH: -0.25, GOLD: 0.30 },
      description: 'Persistent high inflation combined with high unemployment.',
    },
    {
      name: 'Currency Crisis',
      tier: 2,
      shocks: { CRYPTO: 0.50, CASH: -0.35 },
      description: 'National currency devaluation drives capital to digital assets.',
    },
    {
      name: 'Energy Crisis',
      tier: 2,
      shocks: { INDUSTRIAL: -0.40, CONSUMER: -0.30, BOND: -0.20, GOLD: 0.25 },
      description: 'Global energy shortage spikes production costs and inflation.',
    },
    {
      name: 'Cyber Warfare',
      tier: 2,
      shocks: { TECH: -0.45, CRYPTO: -0.20, BOND: -0.15 },
      description: 'Nation-state cyber attack disrupts financial infrastructure.',
    },

    // Tier 3: Catastrophic (-40%+)
    {
      name: 'Global Pandemic',
      tier: 3,
      shocks: { TECH: -0.45, INDUSTRIAL: -0.45, CONSUMER: -0.45, CRYPTO: -0.45, BOND: -0.45, GOLD: 0.20 },
      description: 'Total market collapse as human activity grinds to a halt.',
    },
    {
      name: 'Geopolitical Conflict',
      tier: 3,
      shocks: { INDUSTRIAL: 0.60, TECH: -0.50, BOND: -0.50 },
      description: 'Outbreak of major war shifts focus to energy and defense.',
    },
    {
      name: 'Hyperinflation',
      tier: 3,
      shocks: { CASH: -0.70, GOLD: 0.80 },
      description: 'Currency loses almost all value; gold becomes the only refuge.',
    },
    {
      name: 'Global Debt Default',
      tier: 3,
      shocks: { BOND: -0.80, TECH: -0.50, CASH: -0.40, GOLD: 0.60 },
      description: 'Major sovereign nations default, crashing the global credit market.',
    },
    {
      name: 'Solar Superstorm',
      tier: 3,
      shocks: { TECH: -0.90, CRYPTO: -0.80, INDUSTRIAL: -0.60, CONSUMER: -0.40, GOLD: 0.40 },
      description: 'Colossal solar flare knocks out power grids and satellite networks.',
    },
  ];

  getRandomTier1Event(): BlackSwanEvent | null {
    if (Math.random() > 0.15) return null; // 15% probability per spec
    const tier1Events = this.events.filter(e => e.tier === 1);
    return tier1Events[Math.floor(Math.random() * tier1Events.length)];
  }

  getEventByName(name: string): BlackSwanEvent | undefined {
    return this.events.find(e => e.name === name);
  }

  getAllEvents(): BlackSwanEvent[] {
    return this.events;
  }

  /** Get a random event for a specific tier (for facilitator injection) */
  getRandomEventByTier(tier: 1 | 2 | 3): BlackSwanEvent {
    const tierEvents = this.events.filter(e => e.tier === tier);
    return tierEvents[Math.floor(Math.random() * tierEvents.length)];
  }

  /**
   * Apply Black Swan shocks to a price map.
   * Returns the mutated prices after applying per-class multipliers.
   */
  applyBlackSwan(
    event: BlackSwanEvent,
    currentPrices: Record<string, number>,
    assetClassMap: Record<string, AssetClass>,
  ): Record<string, number> {
    const mutatedPrices = { ...currentPrices };

    for (const [symbol, price] of Object.entries(currentPrices)) {
      const assetClass = assetClassMap[symbol];
      if (!assetClass) continue;

      const shock = event.shocks[assetClass];
      if (shock !== undefined) {
        mutatedPrices[symbol] = Math.max(0.01, price * (1 + shock));
        this.logger.log(`${event.name}: ${symbol} shock ${(shock * 100).toFixed(1)}% → $${mutatedPrices[symbol].toFixed(2)}`);
      }
    }

    return mutatedPrices;
  }

  /** How many rounds a Black Swan takes to recover, by tier */
  getRecoveryRounds(tier: 1 | 2 | 3): number {
    switch (tier) {
      case 1: return 2;
      case 2: return 3;
      case 3: return 5;
    }
  }

  /**
   * Apply partial recovery to prices after a Black Swan.
   * Each round restores a fraction of the shock.
   * @param roundsSinceEvent - how many rounds since the event fired
   * @param totalRecoveryRounds - from getRecoveryRounds()
   */
  applyRecovery(
    currentPrices: Record<string, number>,
    prePrices: Record<string, number>,
    roundsSinceEvent: number,
    totalRecoveryRounds: number,
  ): Record<string, number> {
    if (roundsSinceEvent >= totalRecoveryRounds) return prePrices; // Full recovery

    const recoveryPct = roundsSinceEvent / totalRecoveryRounds;
    const recovered: Record<string, number> = {};

    for (const [symbol, currentPrice] of Object.entries(currentPrices)) {
      const prePrice = prePrices[symbol] || currentPrice;
      const gap = prePrice - currentPrice;
      recovered[symbol] = currentPrice + (gap * recoveryPct);
    }

    return recovered;
  }
}
