import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@hackanomics/database';
// @ts-ignore - Prisma types might be out of sync
import { GameSession } from '@hackanomics/database';
import { GameService } from '../game/game.service';
import { AuditService } from '../audit/audit.service';

const prisma = new PrismaClient();

@Injectable()
export class SessionService {
  constructor(
    private gameService: GameService,
    private auditService: AuditService,
  ) {}
  async createSession(facilitatorId: string, name: string, maxPlayers: number, scenarioId?: string): Promise<GameSession> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char code
    
    return prisma.gameSession.create({
      data: {
        name,
        code,
        maxPlayers,
        status: 'WAITING',
        facilitatorId,
        scenarioId: scenarioId || 'TECH_CRISIS',
      },
    });
  }

  async joinSession(userId: string, code: string) {
    const session = await prisma.gameSession.findUnique({
      where: { code },
    });

    if (!session || session.status !== 'WAITING') {
      throw new NotFoundException('Session not found or already started.');
    }

    // Create SessionPlayer (upsert handles rejoins)
    const sessionPlayer = await prisma.sessionPlayer.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      create: {
        sessionId: session.id,
        userId,
      },
      update: {
        isActive: true,
      },
    });

    // Create Portfolio if it doesn't exist ($100,000 starting cash)
    const existingPortfolio = await prisma.portfolio.findUnique({
      where: { sessionPlayerId: sessionPlayer.id },
    });

    if (!existingPortfolio) {
      await prisma.portfolio.create({
        data: {
          userId,
          sessionPlayerId: sessionPlayer.id,
          cashBalance: 100000,
          totalValue: 100000,
        },
      });
    }

    return {
      sessionId: session.id,
      name: session.name,
    };
  }

  async startSession(sessionId: string) {
    return this.gameService.startSession(sessionId);
  }

  async pauseSession(sessionId: string) {
    return this.gameService.pauseSession(sessionId);
  }

  async nextRound(sessionId: string) {
    return this.gameService.nextRound(sessionId);
  }

  async openMarket(sessionId: string) {
    return this.gameService.openMarket(sessionId);
  }

  async endSession(sessionId: string) {
    return this.gameService.endSession(sessionId);
  }
}
