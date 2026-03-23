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
  ): NewsEvent {
    const rDelta = prevMacro ? currentMacro.interestRate - prevMacro.interestRate : 0;
    const piDelta = prevMacro ? currentMacro.inflation - prevMacro.inflation : 0;
    const gDelta = prevMacro ? currentMacro.gdpGrowth - prevMacro.gdpGrowth : 0;

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
        },
        {
          headline: `☢️ CATACLYSMIC EVENT: ${event} CRIPPLES ECONOMY`,
          body: `The ${event} has fundamentally broken market assumptions. Quantitative models are failing as the world reacts to this nightmare scenario.`,
          hint: `Diversity won't save you here. High-sensitivity assets will bleed the fastest.`,
        },
        {
          headline: `🛑 SYSTEM OVERRIDE: ${event} IMPACT IMMINENT`,
          body: `Trading is halted on several exchanges following the ${event}. This is not a drill. Adjust your risk parameters immediately.`,
          hint: `Short-term yields are spiking. Fixed income and defensive positions are the only sanctuary.`,
        },
        {
          headline: `💀 DARK FRIDAY: ${event} ASHES THE MARKETS`,
          body: `The ${event} has sent shockwaves through every continent. What began as a local tremor is now a global extinction event for portfolios.`,
          hint: `When the system breaks, trust only in hard assets and extreme caution.`,
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { interestRate: rDelta, inflation: piDelta, gdpGrowth: gDelta }, blackSwanTier: 3 };
    }

    // 2. Initial State
    if (!prevMacro) {
      const variants = [
        {
          headline: "🌐 GLOBAL MARKETS INITIALIZED",
          body: "The simulation is live. Investors are watching interest rates and GDP growth closely as the current cycle begins.",
          hint: "Diversify your portfolio across stocks, bonds, and commodities to manage initial uncertainty.",
        },
        {
          headline: "📡 SYSTEM ONLINE: MARKET CYCLE 1.0",
          body: "Macro data streams are converging. The first round of economic variables has stabilized. Execute your opening positions.",
          hint: "Early cycles are about positioning. Don't over-leverage until you see the first rate move.",
        },
        {
          headline: "🏛️ CENTRAL BANK PROTOCOLS ACTIVE",
          body: "The economy is at its baseline. Monetary policy is neutral, and corporate outlooks are being established by the new administration.",
          hint: "Check the 'Asset Intel' tab to see how each instrument reacts to Inflation and GDP.",
        },
        {
          headline: "⚡ NEURAL CONNECTIVITY ESTABLISHED",
          body: "The HCK Terminal is synchronized. Market participants are entering the fray. Expect high initial volume as assets find their floor.",
          hint: "Bonds are your baseline. Stocks are your growth. Crypto is your volatility.",
        },
        {
          headline: "🌑 THE GENESIS BLOCK",
          body: "A new era of asset management begins today. The board is set. The pieces are moving. Will you dominate the macro economy?",
          hint: "The most successful operatives use a 'Smooth' strategy—rebalancing every round.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: {} };
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
        },
        {
          headline: `💸 THE END OF CHEAP CREDIT: +${rDelta.toFixed(2)}% HIKE`,
          body: `Borrowing costs have just hitting levels not seen in years. The 'Discount Rate' is the new hammer for inflation.`,
          hint: "Watch your margin. At these rates, holding cash or short-term notes becomes a viable strategy.",
        },
        {
          headline: `📉 SHOCK HIKE: ${rDelta.toFixed(2)}% RATE INCREASE`,
          body: `Market analysts are stunned as the central bank delivers a larger-than-expected rate hike to combat overheating.`,
          hint: "The NPV of future earnings for growth stocks takes a direct hit. Value stocks may hold up better.",
        },
        {
          headline: `🏛️ MONETARY TIGHTENING: RATES UP BY ${rDelta.toFixed(2)}%`,
          body: `The faucet is closing. Liquidity is being drained from the system to ensure long-term price stability.`,
          hint: "Yield curves are flattening. If short-term rates exceed long-term, watch out for recession signals.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { interestRate: rDelta } };
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
          headline: `💸 PURCHASING POWER PLUMMETS: INFLATION AT ${currentMacro.inflation.toFixed(1)}%`,
          body: `The cost of living is spiraling. Supply chain disruptions and wage pressure are driving prices into the stratosphere.`,
          hint: "Fixed-income investors are losing real value. Nominal returns aren't enough when inflation is this high.",
        },
        {
          headline: `🥖 THE BREAD BASKET BLOWOUT: ${currentMacro.inflation.toFixed(1)}% INFLATION`,
          body: `Energy and food costs are the main drivers as the Consumer Price Index defies all expert predictions.`,
          hint: "Commodities like OIL and wheat are direct beneficiaries of supply-side inflation.",
        },
        {
          headline: `⚠️ INFLATION WARNING: ${currentMacro.inflation.toFixed(1)}% AND CLIMBING`,
          body: `Economic data points to an 'Inflationary Spiral'. Companies with pricing power are the only ones surviving the crunch.`,
          hint: "Real assets have intrinsic value that adjusts with the currency devaluation.",
        },
        {
          headline: `🌋 PRICE ERUPTION: ${currentMacro.inflation.toFixed(1)}% CPI PRINT`,
          body: `The genie is out of the bottle. Hyper-inflationary trends are starting to emerge in core sectors.`,
          hint: "Gold is the ancient hedge. Crypto is the digital hedge. Choose your operative tools wisely.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { inflation: piDelta } };
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
          headline: `🛑 ECONOMIC STALL: GDP GROWTH AT ${currentMacro.gdpGrowth.toFixed(1)}%`,
          body: "The engine has stopped. Demand is weakening across the board as consumers tighten their belts.",
          hint: "In a downturn, high-quality DIVIDEND stocks provide a buffer against capital loss.",
        },
        {
          headline: `🌫️ THE GREAT SLOWDOWN: ${currentMacro.gdpGrowth.toFixed(1)}% GROWTH`,
          body: "Manufacturing indexes are reaching zero. The labor market is starting to show cracks as growth evaporates.",
          hint: "Interest rates might drop soon if the recession persists. Prepare for a potential 'pivot'.",
        },
        {
          headline: `⚠️ NEGATIVE GROWTH: ${currentMacro.gdpGrowth.toFixed(1)}% GDP DECLINE`,
          body: "Two consecutive quarters of this will be an official recession. Large-cap stocks are the first to feel the chill.",
          hint: "Cash is a tactical retreat. Wait for signs of a 'V-shaped' recovery before going high-risk.",
        },
        {
          headline: `🧊 ECONOMIC WINTER: GDP FREEZES AT ${currentMacro.gdpGrowth.toFixed(1)}%`,
          body: "Investment is drying up. Productivity is at a standstill. The macro climate is becoming hostile for growth-first portfolios.",
          hint: "Bonds are a safe harbor. As growth slows, the relative yield of debt becomes more valuable.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { gdpGrowth: gDelta } };
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
          headline: `✨ GOLDEN CYCLE: ${currentMacro.gdpGrowth.toFixed(1)}% GROWTH, LOW RATES`,
          body: "The perfect macro storm. High output and low borrowing costs are creating generational wealth for aggressive investors.",
          hint: "This is the time for Beta. Tech and Discretionary spending are leading the charge.",
        },
        {
          headline: `💎 RISK-ON APPORTUNITY: GDP EXPLODES ${currentMacro.gdpGrowth.toFixed(1)}%`,
          body: "Liquidity is flowing and the economy is growing. Every dip is being bought by institutional algos.",
          hint: "Crypto and small-cap stocks are where the 'alpha' is during a true bull run.",
        },
        {
          headline: `📈 RECORD BREAKING QUARTER: ${currentMacro.gdpGrowth.toFixed(1)}% GROWTH`,
          body: "Corporate profits are hitting all-time highs as the economy enters a super-cycle of productivity.",
          hint: "Don't fight the trend. But keep an eye on inflation—it usually follows a booming GDP.",
        },
        {
          headline: `🌟 MACRO NIRVANA: GROWTH HITS ${currentMacro.gdpGrowth.toFixed(1)}%`,
          body: "Optimism is at an extreme. Innovation is accelerating and unemployment is disappearing.",
          hint: "Enjoy the ride, but remember the cycle always turns. Use trailing stops on your high-growth positions.",
        }
      ];
      const pick = this.getRandom(variants);
      return { ...pick, macroDeltas: { gdpGrowth: gDelta, interestRate: rDelta } };
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
      },
      {
        headline: "📡 TRANMISSION: STEADY STATE DETECTED",
        body: "Macro noise is low. The market is consolidating as it waits for the next major central bank announcement.",
        hint: "Volatility is low. This is a good time to rebalance your percentages precisely to 100%.",
      },
      {
        headline: "🔍 MONITORING SUBTLE SHIFTS",
        body: "Minor adjustments in interest rates and global output are being priced in. No major shocks on the horizon.",
        hint: "Look for lagging assets. In a neutral market, undervalued instruments often catch up to the leaders.",
      },
      {
        headline: "🌬️ CALM BEFORE THE STORM?",
        body: "The macro environment is unusually quiet. Seasoned operatives are using this time to shore up their defenses.",
        hint: "A 'Smooth' operative never stops researching. Check your Asset Information often.",
      }
    ];
    const pick = this.getRandom(variants);
    return { ...pick, macroDeltas: { interestRate: rDelta, inflation: piDelta, gdpGrowth: gDelta } };
  }
}
