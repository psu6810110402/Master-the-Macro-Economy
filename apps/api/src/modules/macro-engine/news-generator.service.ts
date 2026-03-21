import { Injectable, Logger } from '@nestjs/common';

export interface NewsEvent {
  headline: string;
  body: string;
  hint: string;
  macroDeltas: {
    interestRate?: number;
    inflation?: number;
    gdpGrowth?: number;
  };
  blackSwanTier?: 1 | 2 | 3;
}

@Injectable()
export class NewsGeneratorService {
  private readonly logger = new Logger(NewsGeneratorService.name);

  generateNews(
    currentMacro: { interestRate: number; inflation: number; gdpGrowth: number; blackSwanActive: boolean; blackSwanEvent?: string | null },
    prevMacro: { interestRate: number; inflation: number; gdpGrowth: number } | null
  ): NewsEvent {
    // 1. Check for Black Swan first (Highest Priority)
    if (currentMacro.blackSwanActive && currentMacro.blackSwanEvent) {
      return {
        headline: `🚨 BREAKING: ${currentMacro.blackSwanEvent.toUpperCase()} SHOCKS GLOBAL MARKETS`,
        body: `Unprecedented volatility as ${currentMacro.blackSwanEvent} triggers emergency protocols across major exchanges. Expect widespread impact on all asset classes.`,
        hint: `Safe havens like GOLD and BONDS may offer protection during tier 3 catastrophes.`,
        macroDeltas: {
          interestRate: prevMacro ? currentMacro.interestRate - prevMacro.interestRate : 0,
          inflation: prevMacro ? currentMacro.inflation - prevMacro.inflation : 0,
          gdpGrowth: prevMacro ? currentMacro.gdpGrowth - prevMacro.gdpGrowth : 0,
        },
        blackSwanTier: 3, // Assuming major for now
      };
    }

    if (!prevMacro) {
      return {
        headline: "🌐 GLOBAL MARKETS INITIALIZED",
        body: "The simulation is live. Investors are watching interest rates and GDP growth closely as the current cycle begins.",
        hint: "Diversify your portfolio across stocks, bonds, and commodities to manage initial uncertainty.",
        macroDeltas: {},
      };
    }

    const rDelta = currentMacro.interestRate - prevMacro.interestRate;
    const piDelta = currentMacro.inflation - prevMacro.inflation;
    const gDelta = currentMacro.gdpGrowth - prevMacro.gdpGrowth;

    // 2. Significant Rate Hike
    if (rDelta >= 0.5) {
      return {
        headline: `🏦 FED RAISES RATES +${rDelta.toFixed(2)}% — BOND MARKETS SURGE`,
        body: `Central banks move aggressively to tighten monetary policy. Higher borrowing costs are expected to cool the economy.`,
        hint: "Bonds typically become more attractive as yields rise, while tech stocks may face valuation pressure.",
        macroDeltas: { interestRate: rDelta },
      };
    }

    // 3. Inflation Spike
    if (currentMacro.inflation >= 5.0) {
      return {
        headline: `🔥 CPI HITS ${currentMacro.inflation.toFixed(1)}% — GOLD DEMAND SPIKES`,
        body: `Inflation reaches multi-year highs, eroding purchasing power. Markets are searching for effective hedges against rising prices.`,
        hint: "Hard assets like GOLD and COMMODITIES traditionally perform well during high inflation periods.",
        macroDeltas: { inflation: piDelta },
      };
    }

    // 4. Recession Signal
    if (currentMacro.gdpGrowth <= 0) {
      return {
        headline: `📉 GDP CONTRACTS ${currentMacro.gdpGrowth.toFixed(1)}% — SAFE HAVENS IN DEMAND`,
        body: "Economic growth turns negative as recession fears grip the market. Corporate earnings forecasts are being slashed.",
        hint: "Defensive sectors and BONDS often outperform when growth slows down.",
        macroDeltas: { gdpGrowth: gDelta },
      };
    }

    // 5. Bull Market
    if (currentMacro.gdpGrowth >= 3.0 && currentMacro.interestRate <= 3.0) {
      return {
        headline: `🚀 STRONG GDP GROWTH ${currentMacro.gdpGrowth.toFixed(1)}% — RISK ASSETS RALLY`,
        body: "Robust economic indicators and moderate rates fuel a massive rally in equities and digital assets.",
        hint: "STOCKS and CRYPTO tend to thrive in low-rate, high-growth environments.",
        macroDeltas: { gdpGrowth: gDelta, interestRate: rDelta },
      };
    }

    // Default: Neutral / Moderate cycle
    return {
      headline: "📊 MARKET CYCLE EVOLVES",
      body: "Economic indicators show moderate shifts. Investors remain cautious as they transition to the next phase of the simulation.",
      hint: "Monitor individual asset sensitivities to see which sectors are leading the new round.",
      macroDeltas: { interestRate: rDelta, inflation: piDelta, gdpGrowth: gDelta },
    };
  }
}
