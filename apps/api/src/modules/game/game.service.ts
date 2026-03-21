import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameEngine } from '@hackanomics/engine';
import { GameState } from '@hackanomics/engine/dist/types/Game';
import { PrismaClient } from '@hackanomics/database';
import { MarketService } from './market.service';
import { AuditService } from '../audit/audit.service';
import { ScenarioService } from '../macro-engine/scenario.service';
import { MacroEngineService } from '../macro-engine/macro-engine.service';
import { NewsGeneratorService } from '../macro-engine/news-generator.service';
import { ScoringService } from '../macro-engine/scoring.service';
import { TradeResolutionService } from './trade-resolution.service';

const prisma = new PrismaClient();

// Structured payload that both gateway and REST controllers return
export interface RoundPayload {
  state: GameState;
  news: any;
  macro: {
    interestRate: number;
    inflation: number;
    gdpGrowth: number;
    volatility: number;
    blackSwanActive: boolean;
    blackSwanEvent?: string | null;
  };
  round: number;
  timer: number;
  assetPrices: Record<string, number>;
  isGameOver?: boolean;
  rankings?: any[];
  scores?: any[];
}

@Injectable()
export class GameService {
  private engines = new Map<string, GameEngine>();
  private readonly logger = new Logger(GameService.name);

  constructor(
    private marketService: MarketService,
    private auditService: AuditService,
    private scenarioService: ScenarioService,
    private macroEngine: MacroEngineService,
    private newsGenerator: NewsGeneratorService,
    private scoringService: ScoringService,
    private tradeResolution: TradeResolutionService,
  ) {}

  async getOrCreateEngine(sessionId: string): Promise<GameEngine> {
    if (this.engines.has(sessionId)) {
      return this.engines.get(sessionId)!;
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const initialState: GameState = {
      players: [],
      currentRound: session.roundNumber || 1,
      isPaused: session.status === 'PAUSED',
      status: session.status as any,
      scenarioId: session.scenarioId,
      assetPrices: {},
      sessionId,
      readyPlayers: [],
      newsAckPlayers: [],
    };

    const assets = await prisma.asset.findMany({ where: { isActive: true } });
    const prices: Record<string, number> = {};
    
    for (const asset of assets) {
      const latestPrice = await prisma.assetPrice.findFirst({
        where: { assetId: asset.id, sessionId },
        orderBy: { recordedAt: 'desc' },
      });
      
      const baselinePrice = await prisma.assetPrice.findFirst({
        where: { assetId: asset.id, sessionId: null },
        orderBy: { recordedAt: 'desc' },
      });

      prices[asset.symbol] = latestPrice 
        ? Number(latestPrice.price) 
        : (baselinePrice ? Number(baselinePrice.price) : (this.marketService.getBasePrice(asset.symbol) || 100));
    }
    initialState.assetPrices = prices;

    const engine = new GameEngine(initialState);
    this.engines.set(sessionId, engine);
    return engine;
  }

  async startSession(sessionId: string): Promise<RoundPayload> {
    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const scenario = this.scenarioService.getScenarioById(session.scenarioId);
    
    await prisma.macroState.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: 1 } },
      create: {
        sessionId,
        roundNumber: 1,
        interestRate: scenario?.initialMacro.r ?? 2.5,
        inflation: scenario?.initialMacro.pi ?? 3.0,
        gdpGrowth: scenario?.initialMacro.g ?? 2.8,
        volatility: scenario?.volatility === 'CHAOS' ? 0.8 : (scenario?.volatility === 'HIGH' ? 0.5 : 0.3),
      },
      update: {},
    });

    const engine = await this.getOrCreateEngine(sessionId);
    engine.updateStatus('ACTIVE');
    
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date(), roundNumber: 1 },
    });

    await prisma.round.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: 1 } },
      create: {
        sessionId,
        roundNumber: 1,
        priceSnapshot: JSON.stringify(engine.getState().assetPrices),
      },
      update: {},
    });

    await this.auditService.log(null, 'SESSION_STARTED', `Session:${sessionId}`, {
      status: 'ACTIVE',
      scenarioId: session.scenarioId,
    });
    
    // Generate initial news
    const macro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: 1 } },
    });
    const news = this.newsGenerator.generateNews(macro as any, null);

    const state = engine.getState();
    return {
      state,
      news,
      macro: {
        interestRate: macro!.interestRate,
        inflation: macro!.inflation,
        gdpGrowth: macro!.gdpGrowth,
        volatility: macro!.volatility,
        blackSwanActive: macro!.blackSwanActive,
        blackSwanEvent: macro!.blackSwanEvent,
      },
      round: state.currentRound,
      timer: 0, // Timer starts after news dismiss
      assetPrices: state.assetPrices,
    };
  }

  async nextRound(sessionId: string): Promise<RoundPayload> {
    const engine = await this.getOrCreateEngine(sessionId);
    const state = engine.getState();
    const currentRoundNumber = state.currentRound;

    if (currentRoundNumber >= 5) {
      return this.endSession(sessionId);
    }

    const nextRoundNumber = currentRoundNumber + 1;
    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    const scenario = this.scenarioService.getScenarioById(session?.scenarioId || '');

    const currentMacro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: currentRoundNumber } },
    });

    const deltaIndex = currentRoundNumber; 
    const delta = scenario?.roundDeltas[deltaIndex];

    // Create macro state for next round
    const nextMacroData = {
      sessionId,
      roundNumber: nextRoundNumber,
      interestRate: (currentMacro?.interestRate ?? 2.5) + (delta?.r ?? 0),
      inflation: (currentMacro?.inflation ?? 3.0) + (delta?.pi ?? 0),
      gdpGrowth: (currentMacro?.gdpGrowth ?? 2.8) + (delta?.g ?? 0),
      volatility: currentMacro?.volatility ?? 0.3,
    };

    await prisma.macroState.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
      create: nextMacroData,
      update: {},
    });

    // Close current round (snapshot prices), advance round counter
    await prisma.$transaction(async (tx: any) => {
      await tx.round.update({
        where: { sessionId_roundNumber: { sessionId, roundNumber: currentRoundNumber } },
        data: { endedAt: new Date(), priceSnapshot: JSON.stringify(state.assetPrices) },
      });

      await tx.gameSession.update({
        where: { id: sessionId },
        data: { roundNumber: nextRoundNumber, status: 'NEWS_BREAK' },
      });
    });

    // Advance engine to next round and calculate new market prices
    engine.nextRound(); 
    const newPrices = await this.marketService.updateMarket(engine, {});
    engine.updateStatus('NEWS_BREAK');

    // Recalculate all portfolio values based on new prices (no reset!)
    await this.recalculatePortfolios(sessionId, newPrices);

    // Create round record for the next round
    await prisma.round.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
      create: {
        sessionId,
        roundNumber: nextRoundNumber,
        priceSnapshot: JSON.stringify(newPrices),
      },
      update: { priceSnapshot: JSON.stringify(newPrices) },
    });

    // Generate news based on macro deltas
    const nextMacro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
    });
    const news = this.newsGenerator.generateNews(nextMacro as any, currentMacro as any);

    const updatedState = engine.getState();
    return {
      state: updatedState,
      news,
      macro: {
        interestRate: nextMacro!.interestRate,
        inflation: nextMacro!.inflation,
        gdpGrowth: nextMacro!.gdpGrowth,
        volatility: nextMacro!.volatility,
        blackSwanActive: nextMacro!.blackSwanActive,
        blackSwanEvent: nextMacro!.blackSwanEvent,
      },
      round: updatedState.currentRound,
      timer: 0, // Timer starts after news dismiss
      assetPrices: updatedState.assetPrices,
    };
  }

  /**
   * Recalculate totalValue for all portfolios in a session based on current prices.
   * Uses batch query to avoid N+1 problem.
   */
  private async recalculatePortfolios(sessionId: string, prices: Record<string, number>) {
    const portfolios = await prisma.portfolio.findMany({
      where: { sessionPlayer: { sessionId } },
      include: {
        holdings: { include: { asset: true } },
      },
    });

    for (const portfolio of portfolios) {
      let holdingsValue = 0;
      for (const h of portfolio.holdings) {
        const livePrice = prices[(h as any).asset.symbol] || 0;
        holdingsValue += Number(h.quantity) * livePrice;
      }
      const total = Number(portfolio.cashBalance) + holdingsValue;

      await prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          totalValue: total,
          returnPct: ((total - 100000) / 100000) * 100,
        },
      });
    }
  }

  async endSession(sessionId: string): Promise<RoundPayload> {
    const engine = await this.getOrCreateEngine(sessionId);
    const state = engine.getState();

    // Recalculate final portfolio values
    await this.recalculatePortfolios(sessionId, state.assetPrices);

    // Calculate scores for all players
    const scores = await this.calculateSessionScores(sessionId);

    engine.updateStatus('COMPLETED');

    await prisma.$transaction(async (tx: any) => {
      // Close current round
      await tx.round.updateMany({
        where: { sessionId, endedAt: null },
        data: { endedAt: new Date(), priceSnapshot: JSON.stringify(state.assetPrices) },
      });

      await tx.gameSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });
    });

    await this.auditService.log(null, 'SESSION_ENDED', `Session:${sessionId}`, { status: 'COMPLETED' });

    const finalState = engine.getState();

    // Get macro for the final payload
    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    const macro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: session?.roundNumber || 5 } },
    });

    return {
      state: finalState,
      news: { headline: '🏁 SIMULATION COMPLETE', body: 'Final results are in.', hint: '', macroDeltas: {} },
      macro: {
        interestRate: macro?.interestRate ?? 0,
        inflation: macro?.inflation ?? 0,
        gdpGrowth: macro?.gdpGrowth ?? 0,
        volatility: macro?.volatility ?? 0,
        blackSwanActive: macro?.blackSwanActive ?? false,
        blackSwanEvent: macro?.blackSwanEvent,
      },
      round: finalState.currentRound,
      timer: 0,
      assetPrices: finalState.assetPrices,
      isGameOver: true,
      scores,
    };
  }

  /**
   * Calculate scores for all players in a session using ScoringService.
   */
  private async calculateSessionScores(sessionId: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { sessionPlayer: { sessionId } },
      include: {
        sessionPlayer: { include: { user: true } },
        holdings: { include: { asset: true } },
      },
    });

    const scores = portfolios.map((portfolio: any) => {
      // Build holdings value map for diversity calculation
      const holdingsMap: Record<string, number> = {};
      for (const h of portfolio.holdings) {
        holdingsMap[h.asset.symbol] = Number(h.quantity) * (portfolio.totalValue ? Number(h.quantity) : 0);
      }

      const totalValue = Number(portfolio.totalValue || 100000);
      const returnPct = Number(portfolio.returnPct || 0) / 100;

      // Simplified scoring — future phases can add historical returns for Sharpe
      const diversity = this.scoringService.calculateDiversity(holdingsMap, totalValue);
      const sharpe = this.scoringService.calculateSharpe([returnPct]); // Single return simplified
      
      const finalScore = this.scoringService.calculateFinalScore({
        sharpeRatio: sharpe,
        maxDrawdown: Math.max(0, -returnPct), // Simplified drawdown
        assetDiversity: diversity,
        blackSwanSurvival: returnPct >= -0.15 ? 3 : (returnPct >= -0.30 ? 2 : (returnPct >= -0.50 ? 1 : 0)),
      });

      return {
        userId: portfolio.sessionPlayer?.userId,
        displayName: portfolio.sessionPlayer?.user?.displayName || 'Unknown',
        totalValue,
        returnPct: Number(portfolio.returnPct || 0),
        score: finalScore,
        diversity: Math.round(diversity * 100),
      };
    });

    // Sort by score descending and assign ranks
    return scores
      .sort((a: any, b: any) => b.score - a.score)
      .map((s: any, i: number) => ({ ...s, rank: i + 1 }));
  }

  async pauseSession(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    const isPaused = !engine.getState().isPaused;
    engine.updateStatus(isPaused ? 'PAUSED' : 'ACTIVE');
    await prisma.gameSession.update({ where: { id: sessionId }, data: { status: isPaused ? 'PAUSED' : 'ACTIVE' } });
    return engine.getState();
  }

  async openMarket(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    engine.updateStatus('ACTIVE');
    engine.setTimer(180); // 3 minutes per round
    const state = engine.getState();
    state.readyPlayers = []; // Reset ready players
    state.newsAckPlayers = []; // Reset news ack
    await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'ACTIVE' } });
    return engine.getState();
  }

  removeEngine(sessionId: string) {
    this.engines.delete(sessionId);
  }
}
