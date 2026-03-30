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

  private getRandom(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  generateNews(
    currentMacro: { interestRate: number; inflation: number; gdpGrowth: number; blackSwanActive: boolean; blackSwanEvent?: string | null },
    prevMacro: { interestRate: number; inflation: number; gdpGrowth: number } | null
  ): NewsEvent & { macro: any } {
    const rDelta = prevMacro ? currentMacro.interestRate - prevMacro.interestRate : 0;
    const piDelta = prevMacro ? currentMacro.inflation - prevMacro.inflation : 0;
    const gDelta = prevMacro ? currentMacro.gdpGrowth - prevMacro.gdpGrowth : 0;

    const absoluteMacro = {
       interestRate: currentMacro.interestRate,
       inflation: currentMacro.inflation,
       gdpGrowth: currentMacro.gdpGrowth,
       blackSwanActive: currentMacro.blackSwanActive,
       blackSwanEvent: currentMacro.blackSwanEvent
    };

    // 1. Black Swan (Highest Priority)
    if (currentMacro.blackSwanActive && currentMacro.blackSwanEvent) {
      const event = currentMacro.blackSwanEvent.toUpperCase();
      const variants = [
        {
          headline: `🚨 BREAKING: ${event} SHOCKS GLOBAL MARKETS`,
          body: `Unprecedented volatility as ${event} triggers emergency protocols across major exchanges. Expect widespread impact on all asset classes.`,
          hint: `Safe havens like GOLD and BONDS may offer protection during tier 3 catastrophes.`,
        },
        {
          headline: `⚠️ BLACK SWAN ALERT: ${event} DETECTED`,
          body: `Global monitoring systems report a severe disruption: ${event}. Markets are entering a state of total panic as liquidity dries up.`,
          hint: `In a tier 3 event, CASH is king but hyperinflation might devalue it. Consider GOLD.`,
        }
      ];
      const pick = this.getRandom(variants);
      return { 
        ...pick, 
        macroDeltas: { interestRate: rDelta, inflation: piDelta, gdpGrowth: gDelta }, 
        blackSwanTier: 3, 
        macro: absoluteMacro 
      };
    }

    // 2. Initial State (Round 1)
    if (!prevMacro) {
      const variants = [
        {
          headline: "🌐 GLOBAL MARKETS INITIALIZED",
          body: `The simulation is live. Current Rate: ${currentMacro.interestRate}%, Inflation: ${currentMacro.inflation}%. The macro cycle begins.`,
          hint: "Diversify your portfolio across stocks, bonds, and commodities to manage initial uncertainty.",
        },
        {
          headline: "📡 SYSTEM ONLINE: MARKET CYCLE 1.0",
          body: `Macro data streams are converging. GDP Growth is at ${currentMacro.gdpGrowth}%. Execute your opening positions.`,
          hint: "Early cycles are about positioning. Don't over-leverage until you see the first rate move.",
        }
      ];
      const pick = this.getRandom(variants);
      return { 
        ...pick, 
        macroDeltas: { interestRate: 0, inflation: 0, gdpGrowth: 0 }, 
        macro: absoluteMacro 
      };
    }

    // 3. Significant Rate Hike
    if (rDelta >= 0.5) {
      const variants = [
        {
          headline: `🏦 FED RAISES RATES +${rDelta.toFixed(2)}% — BOND YIELDS SURGE`,
          body: `Central banks move aggressively to tighten monetary policy. Higher borrowing costs are expected to cool the economy.`,
          hint: "Bonds typically become more attractive as yields rise, while tech stocks may face valuation pressure.",
        },
        {
          headline: `⚔️ HAWKISH TURN: RATES SPIKE +${rDelta.toFixed(2)}%`,
          body: `The war on easy money has begun. Interest rates are climbing faster than anticipated as the central bank tries to regain control.`,
          hint: "Debt-heavy companies and Real Estate usually suffer when borrowing costs explode.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { interestRate: rDelta }, macro: absoluteMacro };
    }

    // 4. Inflation Spike
    if (currentMacro.inflation >= 5.0) {
      const variants = [
        {
          headline: `🔥 CPI HITS ${currentMacro.inflation.toFixed(1)}% — GOLD DEMAND SPIKES`,
          body: `Inflation reaches multi-year highs, eroding purchasing power. Markets are searching for effective hedges against rising prices.`,
          hint: "Hard assets like GOLD and COMMODITIES traditionally perform well during high inflation periods.",
        },
        {
          headline: `🌋 PRICE ERUPTION: ${currentMacro.inflation.toFixed(1)}% CPI PRINT`,
          body: `The genie is out of the bottle. Hyper-inflationary trends are starting to emerge in core sectors.`,
          hint: "Gold is the ancient hedge. Crypto is the digital hedge. Choose your operative tools wisely.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { inflation: piDelta }, macro: absoluteMacro };
    }

    // 5. Recession Signal (Low GDP)
    if (currentMacro.gdpGrowth <= 0) {
      const variants = [
        {
          headline: `📉 GDP CONTRACTS ${currentMacro.gdpGrowth.toFixed(1)}% — RECESSION FEARS`,
          body: "Economic growth turns negative as recession fears grip the market. Corporate earnings forecasts are being slashed.",
          hint: "Defensive sectors and BONDS often outperform when growth slows down.",
        },
        {
          headline: `🧊 ECONOMIC WINTER: GDP FREEZES AT ${currentMacro.gdpGrowth.toFixed(1)}%`,
          body: "Investment is drying up. Productivity is at a standstill. The macro climate is becoming hostile for growth-first portfolios.",
          hint: "Bonds are a safe harbor. As growth slows, the relative yield of debt becomes more valuable.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { gdpGrowth: gDelta }, macro: absoluteMacro };
    }

    // 6. Bull Market
    if (currentMacro.gdpGrowth >= 3.0 && currentMacro.interestRate <= 3.0) {
      const variants = [
        {
          headline: `🚀 STRONG GDP GROWTH ${currentMacro.gdpGrowth.toFixed(1)}% — RISK ASSETS RALLY`,
          body: "Robust economic indicators and moderate rates fuel a massive rally in equities and digital assets.",
          hint: "STOCKS and CRYPTO tend to thrive in low-rate, high-growth environments.",
        },
        {
          headline: `🌟 MACRO NIRVANA: GROWTH HITS ${currentMacro.gdpGrowth.toFixed(1)}%`,
          body: "Optimism is at an extreme. Innovation is accelerating and unemployment is disappearing.",
          hint: "Enjoy the ride, but remember the cycle always turns. Use trailing stops on your high-growth positions.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { gdpGrowth: gDelta, interestRate: rDelta }, macro: absoluteMacro };
    }

    // 7. Neutral / Moderate cycle
    const variants = [
      {
        headline: "📊 MARKET CYCLE EVOLVES",
        body: "Economic indicators show moderate shifts. Investors remain cautious as they transition to the next phase of the simulation.",
        hint: "Monitor individual asset sensitivities to see which sectors are leading the new round.",
      },
      {
        headline: "⚖️ EQUILIBRIUM REACHED: MODERATE DATA",
        body: "Neither too hot nor too cold. The economy is in a 'Goldilocks' zone where steady hands are rewarded over reckless gambling.",
        hint: "Balanced portfolios of 60/40 (Stocks/Bonds) are the benchmark for this type of cycle.",
      }
    ];
    const pick = this.getRandom(variants);
    return { ...pick, macroDeltas: { interestRate: rDelta, inflation: piDelta, gdpGrowth: gDelta }, macro: absoluteMacro };
  }
}
