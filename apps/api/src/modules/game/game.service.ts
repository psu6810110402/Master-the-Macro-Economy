import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { GameEngine } from '@hackanomics/engine';
import { GameState } from '@hackanomics/engine/dist/types/Game';
import { MarketService } from './market.service';
import { AuditService } from '../audit/audit.service';
import { ScenarioService } from '../macro-engine/scenario.service';
import { MacroEngineService } from '../macro-engine/macro-engine.service';
import { NewsGeneratorService } from '../macro-engine/news-generator.service';
import { ScoringService } from '../macro-engine/scoring.service';
import { TradeResolutionService } from './trade-resolution.service';
import { BlackSwanService } from '../macro-engine/black-swan.service';
import { prisma } from '../../prisma';
import { GameGateway } from './game.gateway';
import { GAME_CONFIG } from './game.constants';

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
  private enginePromises = new Map<string, Promise<GameEngine>>();
  private nextRoundInflight = new Map<string, Promise<RoundPayload>>();
  private timerIntervals = new Map<string, NodeJS.Timeout>();
  private draftAllocations = new Map<string, Record<string, number>>();
  private readonly logger = new Logger(GameService.name);

  public setDraftAllocation(sessionId: string, userId: string, allocation: any) {
    this.draftAllocations.set(`${sessionId}:${userId}`, allocation);
  }

  public async autoLockUncommitted(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    const state = engine.getState();
    const players = state.players.filter(p => p.role === 'PLAYER');

    for (const player of players) {
      if (!state.readyPlayers.includes(player.id)) {
        this.logger.log(`Auto-locking player ${player.id} for session ${sessionId}`);
        
        const draftKey = `${sessionId}:${player.id}`;
        let allocation = this.draftAllocations.get(draftKey);

        if (!allocation) {
          if (state.currentRound === 1) {
            allocation = { 'CASH': 100 };
          } else {
            const prevRecord = await prisma.tradeRecord.findFirst({
              where: { sessionId, playerId: player.id, round: state.currentRound - 1 }
            });
            allocation = prevRecord && prevRecord.portfolio ? JSON.parse(prevRecord.portfolio) : { 'CASH': 100 };
          }
        }

        try {
          await this.tradeResolution.commitPortfolio(
            sessionId,
            player.id,
            state.currentRound,
            allocation!,
            state.assetPrices,
            true, // isAutoLock
          );
          engine.setPlayerReady(player.id, true);
        } catch (err) {
          this.logger.error(`Failed to auto-lock player ${player.id}: ${err}`);
        }
        this.draftAllocations.delete(draftKey);
      }
    }
  }

  constructor(
    private marketService: MarketService,
    private auditService: AuditService,
    private scenarioService: ScenarioService,
    private macroEngine: MacroEngineService,
    private newsGenerator: NewsGeneratorService,
    private scoringService: ScoringService,
    private tradeResolution: TradeResolutionService,
    private blackSwanService: BlackSwanService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
  ) {}

  public async handleTimerEnd(sessionId: string) {
    this.logger.log(`Timer ended for session ${sessionId}, auto-locking players.`);
    
    // 1. Auto-lock uncommitted players
    await this.autoLockUncommitted(sessionId);

    // 2. Force round end on clients
    const engine = await this.getOrCreateEngine(sessionId);
    this.gameGateway.server.to(sessionId).emit('game:round_end', { 
       assetPrices: engine.getState().assetPrices 
    });

    // 3. Advance round
    try {
      const payload = await this.nextRound(sessionId);
      await this.gameGateway.broadcastNextRound(sessionId, payload);
    } catch (err) {
      this.logger.error(`Error auto-advancing session ${sessionId}: ${err}`);
    }
  }

  public startTimer(sessionId: string, seconds: number = GAME_CONFIG.DEFAULT_SESSION_DURATION) {
    if (this.timerIntervals.has(sessionId)) {
      clearInterval(this.timerIntervals.get(sessionId)!);
    }

    this.getOrCreateEngine(sessionId).then(engine => {
      engine.setTimer(seconds);

      const interval = setInterval(async () => {
        const remaining = engine.decrementTimer();
        
        // Emit via Gateway
        this.gameGateway.server.to(sessionId).emit('game:timer_tick', { secondsLeft: remaining });

        if (remaining <= 0) {
          this.stopTimer(sessionId);
          await this.handleTimerEnd(sessionId);
        }
      }, 1000);

      this.timerIntervals.set(sessionId, interval);
    });
  }

  public stopTimer(sessionId: string) {
    if (this.timerIntervals.has(sessionId)) {
      clearInterval(this.timerIntervals.get(sessionId)!);
      this.timerIntervals.delete(sessionId);
    }
  }
  async getOrCreateEngine(sessionId: string): Promise<GameEngine> {
    if (!sessionId) {
      throw new NotFoundException('Session ID is required');
    }

    // Use promise-based cache to prevent race conditions during concurrent joins
    if (this.enginePromises.has(sessionId)) {
      return this.enginePromises.get(sessionId)!;
    }

    const promise = this._getOrCreateEngineInternal(sessionId);
    this.enginePromises.set(sessionId, promise);
    return promise;
  }

  private async _getOrCreateEngineInternal(sessionId: string): Promise<GameEngine> {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      this.enginePromises.delete(sessionId);
      throw new NotFoundException('Session not found');
    }

    if (this.engines.has(sessionId)) {
      const engine = this.engines.get(sessionId)!;
      // Ensure engine round is synced with DB if it changed (e.g. from 0 to 1 during start)
      const dbRound = session.roundNumber ?? 0;
      if (engine.getState().currentRound !== dbRound) {
        this.logger.log(`Syncing engine round for ${sessionId}: ${engine.getState().currentRound} -> ${dbRound}`);
        (engine as any).state.currentRound = dbRound; // Force update if engine doesn't have setRound
      }
      return engine;
    }

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const initialState: GameState = {
      players: [],
      currentRound: session.roundNumber ?? 0,
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
    
    // Optimized: Fetch all latest prices for this session in one go
    const latestPrices = await prisma.assetPrice.findMany({
      where: { 
        sessionId,
        assetId: { in: assets.map(a => a.id) }
      },
      orderBy: { recordedAt: 'desc' },
      // Note: This gets ALL prices, we'll pick the most recent per asset manually
      // Use distinct or group by if possible, but distinct on assetId is simpler
      distinct: ['assetId']
    });

    // Optimized: Fetch baseline prices for missing assets
    const baselinePrices = await prisma.assetPrice.findMany({
      where: { 
        sessionId: null,
        assetId: { in: assets.map(a => a.id) }
      },
      orderBy: { recordedAt: 'desc' },
      distinct: ['assetId']
    });

    for (const asset of assets) {
      const latest = latestPrices.find(p => p.assetId === asset.id);
      const baseline = baselinePrices.find(p => p.assetId === asset.id);

      prices[asset.symbol] = latest 
        ? Number(latest.price) 
        : (baseline ? Number(baseline.price) : (this.marketService.getBasePrice(asset.symbol) || 100));
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
    // Move to first round when starting (engine initializes on round 0)
    if (engine.getState().currentRound === 0) {
      engine.nextRound();
    }
    engine.updateStatus('ACTIVE');
    
    // START: Realistic Market Initialization for Round 1
    // Instead of static 100s, let's run the first market update right now.
    const newPrices = await this.marketService.updateMarket(engine, {});
    // END: Realistic Market Initialization
    
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date(), roundNumber: 1 },
    });

    await prisma.round.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: 1 } },
      create: {
        sessionId,
        roundNumber: 1,
        priceSnapshot: JSON.stringify(newPrices),
      },
      update: {
        priceSnapshot: JSON.stringify(newPrices),
      },
    });

    await this.auditService.log(null, 'SESSION_STARTED', `Session:${sessionId}`, {
      status: 'ACTIVE',
      scenarioId: session.scenarioId,
    });
    
    // Fix #9: Random Black Swan Trigger
    if (session.blackSwanEnabled && Math.random() <= 0.15) {
      const event = this.blackSwanService.getRandomEventByTier(1);
      await prisma.macroState.update({
        where: { sessionId_roundNumber: { sessionId, roundNumber: 1 } },
        data: { blackSwanActive: true, blackSwanEvent: event.name, blackSwanTier: 1 }
      });
      this.logger.log(`Random Black Swan Triggered on Round 1: ${event.name}`);
    }
    
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

    this.logger.log(`nextRound called for session ${sessionId}: engineRound=${state.currentRound}, status=${state.status}`);

    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    // Use DB roundNumber as source of truth — engine.currentRound may be 0
    // after a server restart or when startSession was called via REST (not WebSocket).
    const currentRoundNumber = session.roundNumber || state.currentRound;

    this.logger.log(`Session ${sessionId} nextRound: currentRound=${currentRoundNumber}, totalRounds=${session.totalRounds}`);

    if (currentRoundNumber >= session.totalRounds) {
      this.logger.log(`Session ${sessionId} reached max rounds (${session.totalRounds}). Ending session.`);
      return this.endSession(sessionId);
    }

    const nextRoundNumber = currentRoundNumber + 1;
    const scenario = this.scenarioService.getScenarioById(session.scenarioId || '');

    const currentMacro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: currentRoundNumber } },
    });

    const deltaIndex = currentRoundNumber; 
    const delta = scenario?.roundDeltas[deltaIndex];

    // Create macro state for next round, persisting manual overrides and active black swans
    const nextMacroData = {
      sessionId,
      roundNumber: nextRoundNumber,
      interestRate: (currentMacro?.interestRate ?? 2.5) + (delta?.r ?? 0),
      inflation: (currentMacro?.inflation ?? 3.0) + (delta?.pi ?? 0),
      gdpGrowth: (currentMacro?.gdpGrowth ?? 2.8) + (delta?.g ?? 0),
      volatility: currentMacro?.volatility ?? 0.3,
      blackSwanActive: currentMacro?.blackSwanActive ?? false,
      blackSwanTier: currentMacro?.blackSwanTier ?? null,
      blackSwanEvent: currentMacro?.blackSwanEvent ?? null,
    };

    await prisma.macroState.upsert({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
      create: nextMacroData,
      update: nextMacroData, // IMPORTANT: Update if it exists to stay in sync
    });

    // Close current round (snapshot prices), advance round counter
    // Use updateMany with a fallback to avoid "record not found" race condition
    await prisma.$transaction(async (tx: any) => {
      // Ensure current round record exists (create if missing, update if exists)
      await tx.round.upsert({
        where: { sessionId_roundNumber: { sessionId, roundNumber: currentRoundNumber } },
        create: {
          sessionId,
          roundNumber: currentRoundNumber,
          priceSnapshot: JSON.stringify(state.assetPrices),
          endedAt: new Date(),
        },
        update: { 
          endedAt: new Date(), 
          priceSnapshot: JSON.stringify(state.assetPrices) 
        },
      });

      await tx.gameSession.update({
        where: { id: sessionId },
        data: { roundNumber: nextRoundNumber, status: 'NEWS_BREAK' },
      });
    });

    // Advance engine to next round and calculate new market prices
    // Note: engine.nextRound() automatically resets readyPlayers to []
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

    const nextMacro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: nextRoundNumber } },
    });

    if (!nextMacro) {
      this.logger.error(`Failed to find nextMacro for session ${sessionId} round ${nextRoundNumber}`);
      throw new Error('Next round macro state not found');
    }

    // Fix #22: Black Swan Recovery Logic
    let processedPrices = newPrices;
    if ((session as any).blackSwanRoundCount > 0) {
      // We are in recovery phase
      const recoveryRounds = this.blackSwanService.getRecoveryRounds((currentMacro as any)?.blackSwanTier || 1);
      const roundsSinceEvent = (session as any).blackSwanRoundCount;
      
      if (roundsSinceEvent < recoveryRounds) {
        // Fetch pre-swan prices from the round BEFORE the swan hit
        const swanHitRound = currentRoundNumber - roundsSinceEvent;
        const preSwanRound = await prisma.round.findFirst({
           where: { sessionId, roundNumber: swanHitRound - 1 }
        });
        
        if (preSwanRound) {
          const prePrices = JSON.parse(preSwanRound.priceSnapshot);
          processedPrices = this.blackSwanService.applyRecovery(
            newPrices, 
            prePrices, 
            roundsSinceEvent, 
            recoveryRounds
          );
          
          await (prisma.gameSession as any).update({
            where: { id: sessionId },
            data: { blackSwanRoundCount: { increment: 1 } }
          });
        }
      } else {
        // Recovery complete
        await (prisma.gameSession as any).update({
          where: { id: sessionId },
          data: { blackSwanRoundCount: 0 }
        });
      }
    } else if ((currentMacro as any)?.blackSwanActive) {
      // Just hit a swan this round, start recovery counter for next round
      await (prisma.gameSession as any).update({
        where: { id: sessionId },
        data: { blackSwanRoundCount: 1 }
      });
    }

    const news = (this as any).newsGenerator.generateNews(nextMacro as any, currentMacro as any);

    const updatedState = engine.getState();
    updatedState.assetPrices = processedPrices;
    
    return {
      state: updatedState,
      news,
      macro: {
        interestRate: nextMacro?.interestRate ?? 2.5,
        inflation: nextMacro?.inflation ?? 3.0,
        gdpGrowth: nextMacro?.gdpGrowth ?? 2.8,
        volatility: nextMacro?.volatility ?? 0.3,
        blackSwanActive: !!nextMacro?.blackSwanActive,
        blackSwanEvent: nextMacro?.blackSwanEvent,
      },
      round: nextRoundNumber,
      timer: 180,
      assetPrices: processedPrices,
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
    let scores = [];
    try {
      scores = await this.calculateSessionScores(sessionId);
    } catch (err) {
      this.logger.error(`Failed to calculate scores for session ${sessionId}`, err);
    }

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
      where: { sessionId_roundNumber: { sessionId, roundNumber: session?.roundNumber || session?.totalRounds || 5 } },
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
   * Persists results into the Score table.
   */
  private async calculateSessionScores(sessionId: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { sessionPlayer: { sessionId } },
      include: {
        sessionPlayer: { include: { user: true } },
        holdings: { include: { asset: true } },
      },
    });

    // Fetch historical trade records for multi-round returns
    const allTradeRecords = await prisma.tradeRecord.findMany({
      where: { sessionId },
      orderBy: { round: 'asc' },
    });

    // Fetch the final market prices for accurate diversity map scoring
    const currentRound = await prisma.round.findFirst({
      where: { sessionId },
      orderBy: { roundNumber: 'desc' },
    });
    const currentPrices = currentRound?.priceSnapshot ? JSON.parse(currentRound.priceSnapshot) : {};

    const scores = [];
    const playerSummaries: Record<string, string> = {};

    for (const portfolio of portfolios) {
      const userId = portfolio.sessionPlayer?.userId;
      if (!userId) continue;

      // Build holdings value map for diversity calculation based on Live Prices
      const holdingsMap: Record<string, number> = {};
      for (const h of portfolio.holdings) {
        const livePrice = currentPrices[h.asset.symbol] || Number(h.avgCost || 0);
        holdingsMap[h.asset.symbol] = Number(h.quantity) * livePrice;
      }

      const totalValue = Number(portfolio.totalValue || 100000);
      const initialValue = 100000;
      const returnPct = (totalValue - initialValue) / initialValue;

      // Get per-round portfolio values for this player
      const playerRecords = allTradeRecords
        .filter((r: any) => r.playerId === userId)
        .sort((a: any, b: any) => a.round - b.round);
      
      const portfolioValues = [initialValue];
      for (const r of playerRecords) {
        // We capture total value at start of round > 1 (which effectively is the end of the previous round)
        if (r.round > 1) {
          portfolioValues.push(Number(r.totalValue));
        }
      }
      portfolioValues.push(totalValue); // Append exact final end-of-round total value

      
      // Calculate per-round returns for Sharpe
      const returns: number[] = [];
      for (let i = 1; i < portfolioValues.length; i++) {
        returns.push((portfolioValues[i] - portfolioValues[i - 1]) / portfolioValues[i - 1]);
      }

      const diversity = this.scoringService.calculateDiversity(holdingsMap, totalValue);
      const sharpe = this.scoringService.calculateSharpe(returns);
      const maxDrawdown = this.scoringService.calculateMaxDrawdown(portfolioValues);
      const blackSwanSurvival = this.scoringService.calculateBlackSwanSurvival(returnPct);

      const components = { sharpeRatio: sharpe, maxDrawdown, assetDiversity: diversity, blackSwanSurvival };
      const finalScore = this.scoringService.calculateFinalScore(components);

      // Calculate grades per component
      const sharpeScore = Math.min(400, Math.max(0, sharpe * 100));
      const drawdownScore = Math.min(200, Math.max(0, (1 - maxDrawdown) * 200));
      const diversityScore = Math.min(200, Math.max(0, diversity * 200));
      const survivalScore = Math.min(200, Math.max(0, blackSwanSurvival * 66.6));

      const gradeReturn = this.scoringService.calculateGrade(sharpeScore, 400);
      const gradeDiversity = this.scoringService.calculateGrade(diversityScore, 200);
      const gradeRisk = this.scoringService.calculateGrade(drawdownScore, 200);
      const gradeSurvival = this.scoringService.calculateGrade(survivalScore, 200);

      // Persist to DB
      await prisma.score.upsert({
        where: { sessionId_userId: { sessionId, userId } },
        create: {
          sessionId, userId,
          sharpeRatio: sharpe, maxDrawdown, assetDiversity: diversity,
          blackSwanSurvival, finalScore,
          gradeReturn, gradeDiversity, gradeRisk, gradeSurvival,
        },
        update: {
          sharpeRatio: sharpe, maxDrawdown, assetDiversity: diversity,
          blackSwanSurvival, finalScore,
          gradeReturn, gradeDiversity, gradeRisk, gradeSurvival,
        },
      });

      scores.push({
        userId,
        displayName: portfolio.sessionPlayer?.user?.firstName 
          ? `${portfolio.sessionPlayer.user.firstName} ${portfolio.sessionPlayer.user.lastName}`
          : (portfolio.sessionPlayer?.user?.displayName || 'Unknown'),
        totalValue,
        returnPct: Math.round(returnPct * 10000) / 100, // as %
        score: finalScore,
        diversity: Math.round(diversity * 100),
        gradeReturn, gradeDiversity, gradeRisk, gradeSurvival,
      });

      playerSummaries[userId] = `Player ID: ${userId}
Name: ${portfolio.sessionPlayer?.user?.displayName || 'Unknown'}
Start Cash: $100000
Final Value: $${totalValue}
Return: ${returnPct * 100}%
Final Allocation: ${allTradeRecords.reverse().find((r: any) => r.playerId === userId)?.portfolio || "100% CASH"}`;
    }

    // Fix #4: Gemini Batch Call
    const playerAnalyses: Record<string, string> = {};
    if (Object.keys(playerSummaries).length > 0) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { GoogleGenAI } = require('@google/generative-ai');
          const ai = new GoogleGenAI(apiKey);
          const prompt = `You are an elite, harsh financial simulation AI. Analyze the final statuses of these players in one batch. For each player, provide a 1-2 sentence harsh critique of their final portfolio and returns.
Players:
${Object.values(playerSummaries).join('\n\n')}

Return a valid JSON object where keys are Player IDs and values are their individual critiques. Do not include markdown wraps or anything outside the JSON object. Example: {"uuid123": "You held 100% cash while the market rallied. Cowardice is not an investment strategy."}`;
          
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
          
          // Fix #4: Gemini Timeout & Fallback
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini timeout')), 30000)
          );
          
          const result: any = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
          ]);
          
          const response = result.response;

          let text = response.text() || "{}";
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(text);
          Object.assign(playerAnalyses, parsed);
        }
      } catch (err) {
        this.logger.error("Gemini batch analysis failed or timed out", err);
        // Fallback for all players
        for (const userId of Object.keys(playerSummaries)) {
          if (!playerAnalyses[userId]) {
            playerAnalyses[userId] = "Analysis unavailable at this time.";
          }
        }
      }
    }

    // Persist AI Insights
    for (const userId of Object.keys(playerAnalyses)) {
      await prisma.score.update({
        where: { sessionId_userId: { sessionId, userId } },
        data: { geminiAnalysis: playerAnalyses[userId] }
      });
    }

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
