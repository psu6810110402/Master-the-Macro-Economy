import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@hackanomics/database';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private prisma = new PrismaClient();

  async log(
    actorId: string | null,
    action: string,
    resource: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          resource,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress,
          userAgent,
        },
      });
      this.logger.log(`Audit Log: ${action} on ${resource} by ${actorId || 'SYSTEM'}`);
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${action}`, error);
      // We don't throw here to avoid breaking the main business flow if audit fails
    }
  }

  async getRecentLogs(take: number = 50) {
    return this.prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { displayName: true, email: true } } },
    });
  }

  // --- PDPA COMPLIANCE ---
  
  async sweepOldLogs() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });
    this.logger.log(`[PDPA Compliance] Swept ${result.count} audit logs older than 90 days.`);
    return result;
  }

  async anonymizeSessionPlayers(sessionId: string) {
    const players = await this.prisma.sessionPlayer.findMany({
      where: { sessionId },
      include: { user: true }
    });

    for (const player of players) {
      if (player.user && player.user.role === 'PLAYER') {
        const anonId = Math.random().toString(36).substring(7);
        await this.prisma.user.update({
          where: { id: player.userId },
          data: {
            email: `redacted_${anonId}@internal.null`,
            displayName: `REDACTED_OP_${anonId.toUpperCase()}`,
            supabaseId: `redacted_${anonId}`
          }
        });
      }
    }
    this.logger.log(`[PDPA Compliance] Anonymized PII for Session ${sessionId}`);
  }
}

