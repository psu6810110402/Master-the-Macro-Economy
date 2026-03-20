import { MarketAssetType } from './types/Game.js';

export interface MarketEvent {
  id: string;
  headline: string;
  description: string;
  impact: Record<MarketAssetType, number>; // Multipliers like -0.08 for -8%
}

export const MARKET_EVENTS: MarketEvent[] = [
  {
    id: 'INTEREST_RATE_HIKE',
    headline: 'Central Bank Raises Interest Rates by 0.75%',
    description: 'Aggressive move to combat inflation triggers sell-off in growth assets.',
    impact: {
      STOCK: -0.08,
      BOND: 0.06,
      CRYPTO: -0.12,
      COMMODITY: -0.03,
      REAL_ESTATE: -0.10,
    },
  },
  {
    id: 'INTEREST_RATE_CUT',
    headline: 'Fed Slashes Rates to Stimulate Growth',
    description: 'Cheaper borrowing costs drive a surge in equities and real estate.',
    impact: {
      STOCK: 0.09,
      BOND: -0.05,
      CRYPTO: 0.14,
      COMMODITY: 0.04,
      REAL_ESTATE: 0.11,
    },
  },
  {
    id: 'INFLATION_SURGE',
    headline: 'CPI Hits 40-Year High of 8.2%',
    description: 'Currency devalues as commodities and gold soar on inflation hedging.',
    impact: {
      STOCK: -0.05,
      BOND: -0.12,
      CRYPTO: 0.08,
      COMMODITY: 0.18,
      REAL_ESTATE: 0.07,
    },
  },
  {
    id: 'RECESSION_SIGNAL',
    headline: 'GDP Shrinks for Second Consecutive Quarter',
    description: 'Technically in recession. Flight to safety in government bonds begins.',
    impact: {
      STOCK: -0.15,
      BOND: 0.10,
      CRYPTO: -0.18,
      COMMODITY: -0.09,
      REAL_ESTATE: -0.12,
    },
  },
  {
    id: 'TECH_BOOM',
    headline: 'AI Breakthrough Drives Tech Rally',
    description: 'Breakthrough in Generative AI sends tech indices to all-time highs.',
    impact: {
      STOCK: 0.20,
      BOND: -0.04,
      CRYPTO: 0.16,
      COMMODITY: -0.02,
      REAL_ESTATE: 0.03,
    },
  },
  {
    id: 'COMMODITY_SHOCK',
    headline: 'Oil Prices Spike 40% on Supply Crisis',
    description: 'Global energy shortage sends crude prices to historic levels.',
    impact: {
      STOCK: -0.06,
      BOND: -0.03,
      CRYPTO: -0.04,
      COMMODITY: 0.30,
      REAL_ESTATE: -0.02,
    },
  },
  {
    id: 'CRYPTO_BULL',
    headline: 'First Spot Bitcoin ETF Approved',
    description: 'Institutional floodgates open for digital assets as BTC enters mainstage.',
    impact: {
      STOCK: 0.02,
      BOND: -0.02,
      CRYPTO: 0.35,
      COMMODITY: 0.01,
      REAL_ESTATE: 0.00,
    },
  },
  {
    id: 'CRYPTO_CRASH',
    headline: 'Major Crypto Exchange Declares Bankruptcy',
    description: 'Contagion effects trigger massive liquidation across DeFi and tokens.',
    impact: {
      STOCK: -0.04,
      BOND: 0.08,
      CRYPTO: -0.40,
      COMMODITY: -0.01,
      REAL_ESTATE: -0.02,
    },
  },
  {
    id: 'GEOPOLITICAL_TENSION',
    headline: 'Trade Conflict Escalates Between Major Economies',
    description: 'New tariffs and sanctions cause uncertainty. Gold prices rise.',
    impact: {
      STOCK: -0.10,
      BOND: 0.12,
      CRYPTO: -0.08,
      COMMODITY: 0.20,
      REAL_ESTATE: -0.05,
    },
  },
  {
    id: 'STIMULUS_PACKAGE',
    headline: 'Government Announces $2 Trillion Recovery Plan',
    description: 'Massive infrastructure spending and direct stimulus checks incoming.',
    impact: {
      STOCK: 0.12,
      BOND: -0.06,
      CRYPTO: 0.10,
      COMMODITY: 0.08,
      REAL_ESTATE: 0.14,
    },
  },
  {
    id: 'CORPORATE_SCANDAL',
    headline: 'Widespread Accounting Fraud in Global Conglomerate',
    description: 'Market trust evaporates as blue-chip transparency is questioned.',
    impact: {
      STOCK: -0.12,
      BOND: 0.07,
      CRYPTO: -0.05,
      COMMODITY: 0.05,
      REAL_ESTATE: -0.03,
    },
  },
  {
    id: 'EARNINGS_BEAT',
    headline: 'Tech Giants Outperform Growth Expectations',
    description: 'Strong quarterly results signal a resilient consumer economy.',
    impact: {
      STOCK: 0.14,
      BOND: -0.05,
      CRYPTO: 0.06,
      COMMODITY: 0.03,
      REAL_ESTATE: 0.05,
    },
  },
];

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  events: string[]; // Array of exactly 5 MarketEvent IDs (Round 1 to 5)
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'TECH_CRISIS',
    name: 'The Tech Bubble Crisis',
    description: 'A booming tech sector meets aggressive monetary tightening.',
    events: [
      'EARNINGS_BEAT',      // Round 1: Soft start
      'TECH_BOOM',          // Round 2: Excitement builds
      'INFLATION_SURGE',    // Round 3: Warning signs
      'INTEREST_RATE_HIKE', // Round 4: The catalyst
      'RECESSION_SIGNAL',   // Round 5: The climax
    ],
  },
  {
    id: 'GLOBAL_CONFLICT',
    name: 'Geopolitical Meltdown',
    description: 'Mounting global tensions lead to a massive supply chain shock.',
    events: [
      'STIMULUS_PACKAGE',     // Round 1: False sense of security
      'INFLATION_SURGE',      // Round 2: Tension builds
      'GEOPOLITICAL_TENSION', // Round 3: The catalyst
      'COMMODITY_SHOCK',      // Round 4: The climax
      'RECESSION_SIGNAL',     // Round 5: The aftermath
    ],
  },
  {
    id: 'CRYPTO_WINTER',
    name: 'The Great Crypto Winter',
    description: 'The explosive rise and dramatic fall of digital assets.',
    events: [
      'TECH_BOOM',           // Round 1: Excitement
      'CRYPTO_BULL',         // Round 2: Euphoria
      'CORPORATE_SCANDAL',   // Round 3: The warning sign
      'CRYPTO_CRASH',        // Round 4: The collapse climax
      'INTEREST_RATE_CUT',   // Round 5: Emergency recovery
    ],
  },
];
