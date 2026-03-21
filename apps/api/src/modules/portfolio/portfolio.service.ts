import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@hackanomics/database';
import { GameService } from '../game/game.service';
import { SCENARIOS } from '@hackanomics/engine';
import { GoogleGenAI } from '@google/genai';

const prisma = new PrismaClient();

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
    const sessionPlayer = await prisma.sessionPlayer.findUnique({
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

    const { session, portfolio } = sessionPlayer;
    const scenarioId = session.scenarioId || 'TECH_CRISIS';
    const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];

    // Format trades for the prompt
    let tradeHistory = portfolio.trades.map((t: any) => 
      `Round ${t.round.roundNumber}: ${t.action} ${t.quantity} ${t.asset.symbol} @ $${t.price} (Total: $${t.total})`
    ).join('\n');

    if (!tradeHistory) tradeHistory = "No trades executed throughout the entire simulation.";

    const prompt = `
    You are an elite, harsh, but highly educational and realistic Financial Advisor analyzing a field operative's (student's) performance in an investment simulation.
    The operative just completed the scenario: "${scenario.name}" - ${scenario.description}
    Here is their complete trade history across the 5 rounds:
    ${tradeHistory}
    
    Final Outcome:
    - Target Starting Capital: $100000
    - Final Cash Balance: $${portfolio.cashBalance}
    - Final Total Portfolio Value (including assets): $${portfolio.totalValue || portfolio.cashBalance}
    - Overall Return: ${portfolio.returnPct || 0}%
    
    Provide a concise, 2-3 paragraph 'Mission Debrief' critiquing their decisions. 
    Point out their best strategic move, their worst mistake, and the core macroeconomic lesson they must take away from surviving (or failing) this specific historical scenario.
    Speak directly to the operative. Tone: Professional, slightly intense, analytical.
    Format: Use plain text paragraphs. No markdown stars or hashtags.
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

      return { analysis: response.text };
    } catch (error) {
      this.logger.error('Failed to generate AI analysis', error);
      return { analysis: "We couldn't reach Sector AI for a debrief at this time. However, the numbers speak for themselves. Analyze your own trades and prepare better for the next market cycle." };
    }
  }
}
