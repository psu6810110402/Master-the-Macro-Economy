import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@hackanomics/database';
import { GameService } from '../game/game.service';
import { AuditService } from '../audit/audit.service';
import { CreateTradeDto } from './dto/create-trade.dto';

const prisma = new PrismaClient();

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(
    private gameService: GameService,
    private auditService: AuditService,
  ) {}

  async executeTrade(userId: string, dto: CreateTradeDto) {
    const { sessionId, symbol, quantity, action } = dto;
    const engine = await this.gameService.getOrCreateEngine(sessionId);
    const livePrice = engine.getPrice(symbol);

    if (livePrice <= 0) {
      throw new BadRequestException(`Invalid price for asset ${symbol}`);
    }

    // 1. Find SessionPlayer & Portfolio
    const sessionPlayer = await prisma.sessionPlayer.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      include: { portfolio: true, session: true },
    });

    if (!sessionPlayer || !sessionPlayer.portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const portfolio = sessionPlayer.portfolio;
    const session = sessionPlayer.session;
    
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException(`Trading is currently suspended. Current Phase: ${session.status}`);
    }

    const totalCost = quantity * livePrice;

    // 2. Find Asset
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) throw new NotFoundException('Asset not found');

    // 3. Find current Round
    const roundNumber = session.roundNumber;
    const round = await prisma.round.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber } },
    });

    if (!round) throw new BadRequestException('Current round not found in database');

    const result = await prisma.$transaction(async (tx: any) => {
      if (action === 'BUY') {
        if (Number(portfolio.cashBalance) < totalCost) {
          throw new BadRequestException('Insufficient cash balance');
        }

        // Update Balance
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { decrement: totalCost } },
        });

        // Upsert Holding
        await tx.holding.upsert({
          where: { portfolioId_assetId: { portfolioId: portfolio.id, assetId: asset.id } },
          create: {
            portfolioId: portfolio.id,
            assetId: asset.id,
            quantity,
            avgCost: livePrice,
          },
          update: {
            quantity: { increment: quantity },
          },
        });
      } else {
        // SELL logic
        const holding = await tx.holding.findUnique({
          where: { portfolioId_assetId: { portfolioId: portfolio.id, assetId: asset.id } },
        });

        if (!holding || Number(holding.quantity) < quantity) {
          throw new BadRequestException('Insufficient holdings');
        }

        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { increment: totalCost } },
        });

        await tx.holding.update({
          where: { portfolioId_assetId: { portfolioId: portfolio.id, assetId: asset.id } },
          data: { quantity: { decrement: quantity } },
        });
      }

      // Create Trade record
      return await tx.trade.create({
        data: {
          portfolioId: portfolio.id,
          assetId: asset.id,
          roundId: round.id,
          action,
          quantity,
          price: livePrice,
          total: totalCost,
        },
      });
    });

    // Logging
    await this.auditService.log(userId, 'TRADE_EXECUTED', `Trade:${result.id}`, {
      symbol,
      quantity,
      price: livePrice,
      total: totalCost,
      action,
    });

    return result;
  }
}

