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
}
