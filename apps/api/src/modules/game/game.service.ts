import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameEngine } from '@hackanomics/engine';
import { GameState } from '@hackanomics/engine/dist/types/Game';
import { PrismaClient } from '@hackanomics/database';
import { MarketService } from './market.service';
import { AuditService } from '../audit/audit.service';
import { ScenarioService } from '../macro-engine/scenario.service';
import { MacroEngineService } from '../macro-engine/macro-engine.service';
import { NewsGeneratorService } from '../macro-engine/news-generator.service';
import { TradeResolutionService } from './trade-resolution.service';

const prisma = new PrismaClient();

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

  async startSession(sessionId: string) {
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

    return { ...engine.getState(), news };
  }

  async nextRound(sessionId: string) {
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

    await prisma.macroState.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
      create: {
        sessionId,
        roundNumber: nextRoundNumber,
        interestRate: (currentMacro?.interestRate ?? 2.5) + (delta?.r ?? 0),
        inflation: (currentMacro?.inflation ?? 3.0) + (delta?.pi ?? 0),
        gdpGrowth: (currentMacro?.gdpGrowth ?? 2.8) + (delta?.g ?? 0),
        volatility: currentMacro?.volatility ?? 0.3,
      },
      update: {},
    });

    await prisma.$transaction(async (tx: any) => {
      await tx.round.update({
        where: { sessionId_roundNumber: { sessionId, roundNumber: currentRoundNumber } },
        data: { endedAt: new Date(), priceSnapshot: JSON.stringify(state.assetPrices) },
      });

      const portfolios = await tx.portfolio.findMany({ where: { sessionPlayer: { sessionId } } });
      for (const portfolio of portfolios) {
        await tx.holding.deleteMany({ where: { portfolioId: portfolio.id } });
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: 100000, totalValue: 100000, returnPct: 0, updatedAt: new Date() },
        });
      }

      await tx.gameSession.update({
        where: { id: sessionId },
        data: { roundNumber: nextRoundNumber, status: 'NEWS_BREAK' },
      });
    });

    engine.nextRound(); 
    await this.marketService.updateMarket(engine, {}); 
    engine.updateStatus('NEWS_BREAK');

    // Generate news for the new round
    const nextMacro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
    });
    const news = this.newsGenerator.generateNews(nextMacro as any, currentMacro as any);

    return { ...engine.getState(), news };
  }

  async endSession(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    engine.updateStatus('COMPLETED');

    await prisma.$transaction(async (tx: any) => {
      await tx.gameSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });
    });

    await this.auditService.log(null, 'SESSION_ENDED', `Session:${sessionId}`, { status: 'COMPLETED' });
    return engine.getState();
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
    await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'ACTIVE' } });
    return engine.getState();
  }

  removeEngine(sessionId: string) {
    this.engines.delete(sessionId);
  }
}
