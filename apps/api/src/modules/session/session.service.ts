import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { GameSession } from '@hackanomics/database';
import { GameService } from '../game/game.service';
import { AuditService } from '../audit/audit.service';
import { prisma } from '../../prisma';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  constructor(
    private gameService: GameService,
    private auditService: AuditService,
  ) {}

  async createSession(facilitatorId: string, name: string, maxPlayers: number, scenarioId?: string, format: string = 'STANDARD'): Promise<GameSession> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char code
    const totalRounds = format === 'SHORT' ? 3 : format === 'FULL' ? 7 : 5;
    
    const session = await prisma.gameSession.create({
      data: {
        name,
        code,
        maxPlayers,
        status: 'WAITING',
        facilitatorId,
        scenarioId: scenarioId || 'TECH_CRISIS',
        format,
        totalRounds
      },
    });

    this.logger.log(`[Session] Created: ${session.id} (${session.code}) by ${facilitatorId}`);
    return session;
  }

  async getSessionsByFacilitator(facilitatorId: string) {
    return prisma.gameSession.findMany({
      where: { facilitatorId },
      orderBy: { createdAt: 'desc' },
      include: {
        players: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            portfolio: { select: { totalValue: true } },
          }
        }
      }
    });
  }

  async getAllSessions() {
    return prisma.gameSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        players: true,
      }
    });
  }

  async joinSession(userId: string, code: string) {
    const session = await prisma.gameSession.findUnique({
      where: { code },
    });

    if (!session || session.status !== 'WAITING') {
      throw new NotFoundException('Session not found or already started.');
    }

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

    this.logger.log(`[Session] User ${userId} joined session ${session.code} (ID: ${session.id})`);
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
    const result = await this.gameService.endSession(sessionId);
    await this.auditService.anonymizeSessionPlayers(sessionId);
    return result;
  }
}
