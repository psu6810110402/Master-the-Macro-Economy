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
}
