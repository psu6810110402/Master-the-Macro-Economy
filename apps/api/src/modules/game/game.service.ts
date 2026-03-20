import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameEngine } from '@hackanomics/engine';
import { GameState } from '@hackanomics/engine/dist/types/Game';
import { PrismaClient } from '@hackanomics/database';
import { MarketService } from './market.service';
import { AuditService } from '../audit/audit.service';

const prisma = new PrismaClient();

@Injectable()
export class GameService {
  private engines = new Map<string, GameEngine>();
  private readonly logger = new Logger(GameService.name);

  constructor(
    private marketService: MarketService,
    private auditService: AuditService,
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
    };

    // Initialize with realistic baseline prices from DB or market.service defaults
    const assets = await prisma.asset.findMany({ where: { isActive: true } });
    const prices: Record<string, number> = {};
    
    for (const asset of assets) {
      // Try to get the latest price from AssetPrice records
      const latestPrice = await prisma.assetPrice.findFirst({
        where: { assetId: asset.id },
        orderBy: { recordedAt: 'desc' },
      });
      
      // Use: DB price → MarketService base prices → fallback 100
      prices[asset.symbol] = latestPrice 
        ? Number(latestPrice.price) 
        : (this.marketService.getBasePrice(asset.symbol) || 100);
    }
    initialState.assetPrices = prices;

    const engine = new GameEngine(initialState);
    this.engines.set(sessionId, engine);
    return engine;
  }

  async startSession(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    engine.updateStatus('ACTIVE');
    
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date(), roundNumber: 1 },
    });

    // Create Round 1 record (required for trades)
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
    });
    
    return engine.getState();
  }

  async pauseSession(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    const isPaused = !engine.getState().isPaused;
    engine.updateStatus(isPaused ? 'PAUSED' : 'ACTIVE');
    
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: isPaused ? 'PAUSED' : 'ACTIVE' },
    });

    await this.auditService.log(null, 'SETTINGS_CHANGED', `Session:${sessionId}`, {
      status: isPaused ? 'PAUSED' : 'ACTIVE',
      action: 'PAUSE_TOGGLE',
    });
    
    return engine.getState();
  }

  async nextRound(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    const state = engine.getState();
    const currentRoundNumber = state.currentRound;

    // Enforce 5-round limit
    if (currentRoundNumber >= 5) {
      this.logger.log(`Session ${sessionId} reached round limit (5). Ending session.`);
      return this.endSession(sessionId);
    }

    await this.auditService.log(null, 'SETTINGS_CHANGED', `Session:${sessionId}`, {
      action: 'NEXT_ROUND',
      fromRound: currentRoundNumber,
      toRound: currentRoundNumber + 1,
    });

    // 1. Persist current round and price snapshot
    await prisma.$transaction(async (tx: any) => {
      // Create Round record
      const round = await tx.round.upsert({
        where: { sessionId_roundNumber: { sessionId, roundNumber: currentRoundNumber } },
        create: {
          sessionId,
          roundNumber: currentRoundNumber,
          priceSnapshot: JSON.stringify(state.assetPrices),
        },
        update: {
          endedAt: new Date(),
        },
      });

      // Save individual AssetPrices for historical charts
      for (const [symbol, price] of Object.entries(state.assetPrices)) {
        const asset = await tx.asset.findUnique({ where: { symbol } });
        if (asset) {
          await tx.assetPrice.create({
            data: {
              assetId: asset.id,
              price,
              sessionId,
              roundNumber: currentRoundNumber,
            },
          });
        }
      }

      // Reset all portfolios for this session to $100,000 and clear holdings
      // As per GDD: "เงินเริ่มต้นต่อ Round | $100,000 (รีเซ็ตทุก Round) — ผลงานจาก Round ก่อนหน้าไม่ติดไปด้วย"
      const portfolios = await tx.portfolio.findMany({
        where: { sessionPlayer: { sessionId } }
      });

      for (const portfolio of portfolios) {
        // Clear holdings
        await tx.holding.deleteMany({
          where: { portfolioId: portfolio.id }
        });

        // Reset cash
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: {
            cashBalance: 100000,
            totalValue: 100000,
            returnPct: 0,
            updatedAt: new Date(),
          }
        });
      }

      // Update GameSession in DB
      await tx.gameSession.update({
        where: { id: sessionId },
        data: {
          roundNumber: currentRoundNumber + 1,
          status: 'NEWS_BREAK',
        },
      });
    });

    // 2. Trigger Market Update for the NEXT round
    const assets = await prisma.asset.findMany({ where: { isActive: true } });
    const assetTypes: Record<string, string> = {};
    assets.forEach((a: any) => (assetTypes[a.symbol] = a.type));

    const oldPrices = { ...state.assetPrices };
    await this.marketService.updateMarket(engine, assetTypes);
    const newPrices = engine.getState().assetPrices;

    // 3. Calculate Gainers
    let topGainer = { symbol: '', change: -Infinity };
    for (const symbol of Object.keys(newPrices)) {
      const oldP = oldPrices[symbol] || 100;
      const newP = newPrices[symbol];
      const change = ((newP - oldP) / oldP) * 100;
      if (change > topGainer.change) {
        topGainer = { symbol, change };
      }
    }

    // 4. Increment round in engine and set to News Break
    engine.nextRound(); // This internally sets state to ACTIVE, so we override next
    engine.updateStatus('NEWS_BREAK');

    return {
      ...engine.getState(),
      summary: {
        previousRound: currentRoundNumber,
        topGainer,
        priceChanges: Object.keys(newPrices).reduce((acc: Record<string, any>, symbol) => {
          const oldP = oldPrices[symbol] || 100;
          const newP = newPrices[symbol];
          acc[symbol] = {
            oldPrice: oldP,
            newPrice: newP,
            changePct: ((newP - oldP) / oldP) * 100,
          };
          return acc;
        }, {}),
      },
    };
  }

  async endSession(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    engine.updateStatus('COMPLETED');

    await prisma.$transaction(async (tx: any) => {
      // 1. Update session status
      await tx.gameSession.update({
        where: { id: sessionId },
        data: { 
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      // 2. Finalize all portfolios in the session
      const portfolios = await tx.portfolio.findMany({
        where: {
          sessionPlayer: {
            sessionId,
          },
        },
        include: {
          holdings: true,
        },
      });

      const prices = engine.getState().assetPrices;

      for (const p of portfolios) {
        let totalValue = Number(p.cashBalance);
        
        for (const h of p.holdings) {
          const price = prices[h.assetId] || 0; // AssetId is used as symbol in engine state for now
          totalValue += Number(h.quantity) * price;
        }

        const startingCapital = 100000;
        const returnPct = ((totalValue - startingCapital) / startingCapital) * 100;

        await tx.portfolio.update({
          where: { id: p.id },
          data: {
            totalValue,
            returnPct,
            updatedAt: new Date(),
          },
        });
      }
    });

    await this.auditService.log(null, 'SESSION_ENDED', `Session:${sessionId}`, {
      status: 'COMPLETED',
    });

    return engine.getState();
  }

  async openMarket(sessionId: string) {
    const engine = await this.getOrCreateEngine(sessionId);
    engine.updateStatus('ACTIVE');
    
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.log(null, 'SETTINGS_CHANGED', `Session:${sessionId}`, {
      action: 'OPEN_MARKET',
      status: 'ACTIVE',
    });
    
    return engine.getState();
  }

  removeEngine(sessionId: string) {
    this.engines.delete(sessionId);
    this.logger.log(`Engine removed for session ${sessionId}`);
  }
}
