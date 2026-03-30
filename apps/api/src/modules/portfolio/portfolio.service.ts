import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { GameService } from '../game/game.service';
import { SCENARIOS } from '@hackanomics/engine';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../prisma';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(private gameService: GameService) {}

  async getPortfolioHistory(userId: string, sessionId: string) {
    const sessionPlayer = await prisma.sessionPlayer.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      include: {
        portfolio: {
          include: { trades: { include: { asset: true } } },
        },
        session: {
          include: { rounds: true }
        }
      },
    });

    if (!sessionPlayer || !sessionPlayer.portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const { portfolio, session } = sessionPlayer;
    const history: Array<{ round: number; value: number; cash: number }> = [];
    
    // Round 0: Start of game
    history.push({ round: 0, value: 100000, cash: 100000 });

    // Track state as we roll forward
    let currentCash = 100000;
    const currentHoldings: Record<string, number> = {};

    // Group trades by round
    const tradesByRound: Record<number, any[]> = {};
    for (const trade of portfolio.trades) {
      const roundNum = session.rounds.find(r => r.id === trade.roundId)?.roundNumber;
      if (roundNum !== undefined) {
        if (!tradesByRound[roundNum]) tradesByRound[roundNum] = [];
        tradesByRound[roundNum].push(trade);
      }
    }

    // Sort rounds
    const rounds = [...session.rounds].sort((a, b) => a.roundNumber - b.roundNumber);

    for (const round of rounds) {
      // Apply trades for this round
      const roundTrades = tradesByRound[round.roundNumber] || [];
      for (const t of roundTrades) {
        if (t.action === 'BUY') {
          currentCash -= t.total;
          currentHoldings[t.asset.symbol] = (currentHoldings[t.asset.symbol] || 0) + t.quantity;
        } else if (t.action === 'SELL') {
          currentCash += t.total;
          currentHoldings[t.asset.symbol] = (currentHoldings[t.asset.symbol] || 0) - t.quantity;
        }
      }

      // Calculate total holding value using the prices recorded at the end of this round
      let roundHoldingsValue = 0;
      if (round.priceSnapshot) {
        try {
          const prices = JSON.parse(round.priceSnapshot) as Record<string, number>;
          for (const [symbol, qty] of Object.entries(currentHoldings)) {
            const price = prices[symbol] || 0;
            roundHoldingsValue += qty * price;
          }
        } catch (e) {
          this.logger.error(`Failed to parse priceSnapshot for round ${round.roundNumber}`, e);
        }
      }

      history.push({
        round: round.roundNumber,
        value: currentCash + roundHoldingsValue,
        cash: currentCash,
      });
    }

    return history;
  }

  async getPortfolio(userId: string, sessionId: string) {
    let sessionPlayer = await prisma.sessionPlayer.findUnique({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      include: {
        portfolio: {
          include: {
            holdings: {
              include: { asset: true },
            },
          },
        },
      },
    });

    // AUTO-JOIN for facilitating testing: If no session player but user is the owner/facilitator, auto-join them.
    if (!sessionPlayer) {
      const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
      if (session && (session.facilitatorId === userId || userId.includes('admin'))) {
        this.logger.log(`Auto-joining facilitator/admin ${userId} to session ${sessionId}`);
        await prisma.sessionPlayer.create({
          data: {
            sessionId,
            userId,
            portfolio: {
              create: {
                userId,
                cashBalance: 100000,
                totalValue: 100000,
              }
            }
          }
        });
        // Re-fetch
        sessionPlayer = await prisma.sessionPlayer.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
          include: { portfolio: { include: { holdings: { include: { asset: true } } } } }
        }) as any;
      }
    }

    if (!sessionPlayer || !sessionPlayer.portfolio) {
      throw new NotFoundException('Portfolio not found for this session');
    }

    const portfolio = sessionPlayer.portfolio;
    const engine = await this.gameService.getOrCreateEngine(sessionId);
    
    // Calculate live value
    let totalHoldingsValue = 0;
    const holdingsWithPrices = portfolio.holdings.map((h: any) => {
      const livePrice = engine.getPrice(h.asset.symbol);
      const value = Number(h.quantity) * livePrice;
      totalHoldingsValue += value;
      
      return {
        ...h,
        livePrice,
        currentValue: value,
      };
    });

    return {
      id: portfolio.id,
      cashBalance: portfolio.cashBalance,
      holdings: holdingsWithPrices,
      totalValue: Number(portfolio.cashBalance) + totalHoldingsValue,
    };
  }

  async generateAnalysis(userId: string, sessionId: string) {
    const sessionPlayer = await prisma.sessionPlayer.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      include: {
        portfolio: {
          include: {
            trades: { include: { asset: true, round: true } },
          },
        },
        session: true,
      },
    });

    if (!sessionPlayer || !sessionPlayer.portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const scoreRow = await prisma.score.findUnique({
      where: { sessionId_userId: { sessionId, userId } }
    });

    const { session, portfolio } = sessionPlayer;
    const scenarioId = session.scenarioId || 'TECH_CRISIS';
    const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];

    // ━━━━ PHASE 4: TOKEN OPTIMIZATION ━━━━
    // Pre-compute basic metrics to save tokens instead of sending raw trades string
    const tradeCount = portfolio.trades.length;
    const tradedAssets = new Set(portfolio.trades.map((t: any) => t.asset.symbol));
    const finalReturn = portfolio.returnPct || 0;
    
    const metrics = {
      totalTradesExecuted: tradeCount,
      uniqueAssetsTraded: Array.from(tradedAssets).join(', ') || 'None',
      finalReturn: `${finalReturn >= 0 ? '+' : ''}${finalReturn.toFixed(2)}%`,
      scenarioName: scenario.name,
      diversityGrade: scoreRow?.gradeDiversity || 'N/A',
      riskGrade: scoreRow?.gradeRisk || 'N/A',
      survivalGrade: scoreRow?.gradeSurvival || 'N/A'
    };

    const prompt = `
    You are an elite, harsh, but highly educational and realistic Financial Advisor analyzing a field operative's performance in an investment simulation.
    Scenario Completed: "${metrics.scenarioName}"
    
    Operative's Performance Metrics:
    - Target Starting Capital: $100000
    - Final Cash Balance: $${portfolio.cashBalance}
    - Final Total Portfolio Value: $${portfolio.totalValue || portfolio.cashBalance}
    - Overall Return: ${metrics.finalReturn}
    - Trading Activity: Executed ${metrics.totalTradesExecuted} trades across these assets: [${metrics.uniqueAssetsTraded}]
    
    The operative received the following evaluation grades (A-F) from the simulation engine:
    - Return: ${scoreRow?.gradeReturn || 'N/A'}
    - Diversity: ${metrics.diversityGrade}
    - Risk Management: ${metrics.riskGrade}
    - Survival (Black Swan): ${metrics.survivalGrade}

    Provide a highly structured JSON response ONLY. Do not include markdown code block syntax like \`\`\`json. Just the raw JSON object.
    Your JSON must have exactly this structure:
    {
      "debrief": "A concise 2-paragraph overall mission debrief pointing out their best move and worst mistake based on the grades.",
      "grades": {
        "Return": "Detailed reason why they got this exact grade for Return.",
        "Diversity": "Reasoning for their Diversity grade, analyzing their asset allocation spread.",
        "Risk": "Reasoning for their Risk Management grade, analyzing if they took too much risk or played it too safe.",
        "Survival": "Reasoning for their Survival grade (how exactly they navigated market shocks)."
      }
    }
    `;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let responseText = response.text || '';
      responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      
      try {
        const parsed = JSON.parse(responseText);
        return { analysis: parsed };
      } catch (e) {
        return { analysis: { debrief: responseText, grades: null } };
      }
    } catch (error) {
      this.logger.error('Failed to generate AI analysis', error);
      return { analysis: { debrief: "We couldn't reach Sector AI for a debrief at this time. However, the numbers speak for themselves. Analyze your own trades and prepare better for the next market cycle.", grades: null } };
    }
  }
}
