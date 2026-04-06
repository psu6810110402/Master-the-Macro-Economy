import { Injectable, Logger } from '@nestjs/common';

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  initialMacro: {
    r: number;   // Interest Rate
    pi: number;  // Inflation
    g: number;   // GDP Growth
  };
  roundDeltas: {
    r: number;
    pi: number;
    g: number;
  }[];
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'CHAOS';
  defaultBlackSwanProb: number;
}

@Injectable()
export class ScenarioService {
  private readonly logger = new Logger(ScenarioService.name);

  private readonly scenarios: ScenarioPreset[] = [
    {
      id: 'PANDEMIC_2020',
      name: '🦠 Pandemic 2020',
      description: 'Sudden demand shock followed by aggressive monetary easing.',
      initialMacro: { r: 1.5, pi: 1.0, g: -5.0 },
      roundDeltas: [
        { r: -0.5, pi: 0.5, g: -10.0 }, // Round 1 deep shock
        { r: -0.5, pi: 1.5, g: 2.0 },   // Round 2 recovery
        { r: 0.0, pi: 3.0, g: 4.0 },    // Round 3 stimmy
        { r: 0.5, pi: 5.0, g: 3.0 },    // Round 4 inflation starts
        { r: 1.0, pi: 8.0, g: 2.0 },    // Round 5 overshoot
      ],
      volatility: 'HIGH',
      defaultBlackSwanProb: 0.20,
    },
    {
      id: 'BULL_MARKET',
      name: '🌱 Secular Bull Market',
      description: 'Low interest rates and strong GDP growth driving asset prices higher.',
      initialMacro: { r: 0.5, pi: 2.0, g: 3.5 },
      roundDeltas: [
        { r: 0.0, pi: 0.1, g: 0.2 },
        { r: 0.0, pi: 0.2, g: 0.3 },
        { r: 0.2, pi: 0.3, g: 0.4 },
        { r: 0.3, pi: 0.4, g: 0.5 },
        { r: 0.5, pi: 0.5, g: 0.6 },
      ],
      volatility: 'LOW',
      defaultBlackSwanProb: 0.05,
    },
    {
      id: 'RATE_HIKE',
      name: '📈 Aggressive Rate Hike',
      description: 'Central banks fighting high inflation by crushing demand.',
      initialMacro: { r: 0.5, pi: 8.0, g: 2.0 },
      roundDeltas: [
        { r: 1.0, pi: -0.5, g: -0.5 },
        { r: 1.0, pi: -1.0, g: -1.0 },
        { r: 1.0, pi: -1.5, g: -1.5 },
        { r: 1.0, pi: -2.0, g: -2.0 },
        { r: 0.5, pi: -1.0, g: -0.5 },
      ],
      volatility: 'MEDIUM',
      defaultBlackSwanProb: 0.10,
    },
    {
      id: 'ENERGY_CRISIS',
      name: '⚡ Global Energy Crisis',
      description: 'Supply shocks in energy leading to stagflation.',
      initialMacro: { r: 2.5, pi: 4.0, g: 1.5 },
      roundDeltas: [
        { r: 0.5, pi: 2.0, g: -1.0 },
        { r: 1.0, pi: 3.0, g: -2.0 },
        { r: 1.5, pi: 4.0, g: -3.0 },
        { r: 0.5, pi: 2.0, g: -1.0 },
        { r: 0.0, pi: 1.0, g: 0.0 },
      ],
      volatility: 'HIGH',
      defaultBlackSwanProb: 0.25,
    },
  ];

  getScenarioById(id: string): ScenarioPreset | undefined {
    return this.scenarios.find(s => s.id === id);
  }

  getAllScenarios(): ScenarioPreset[] {
    return this.scenarios;
  }
}
