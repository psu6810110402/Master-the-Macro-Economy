/**
 * PRESET_PROTOCOLS
 * Standard economic scenarios for facilitators to trigger during workshops.
 */

export interface MacroPreset {
  id: string;
  label: string;
  description: string;
  interestRate: number;
  inflation: number;
  gdpGrowth: number;
  isHighRisk?: boolean; // Requires confirmation
  color: string;
}

export const PRESET_PROTOCOLS: MacroPreset[] = [
  {
    id: 'stable',
    label: 'Stable Growth',
    description: 'The "Goldilocks" economy. Low inflation and steady growth.',
    interestRate: 2.5,
    inflation: 2.0,
    gdpGrowth: 3.0,
    color: 'oklch(var(--status-success))',
  },
  {
    id: 'boom',
    label: 'Economic Boom',
    description: 'Aggressive expansion. High growth but monitoring inflation.',
    interestRate: 4.5,
    inflation: 4.0,
    gdpGrowth: 6.5,
    color: 'oklch(var(--accent-brand))',
  },
  {
    id: 'recession',
    label: 'Recession',
    description: 'Economic contraction. Deflationary pressure and negative growth.',
    interestRate: 0.5,
    inflation: 0.5,
    gdpGrowth: -4.0,
    isHighRisk: true,
    color: 'oklch(var(--status-warning))',
  },
  {
    id: 'hyperinflation',
    label: 'Hyperinflation',
    description: 'Systemic failure. Spiraling prices and currency devaluation.',
    interestRate: 15.0,
    inflation: 25.0,
    gdpGrowth: -2.0,
    isHighRisk: true,
    color: 'oklch(var(--status-error))',
  },
];
