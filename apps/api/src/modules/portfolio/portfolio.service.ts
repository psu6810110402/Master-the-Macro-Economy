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
