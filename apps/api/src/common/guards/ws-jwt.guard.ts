import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaClient } from '@hackanomics/database';

const prisma = new PrismaClient();

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await prisma.user.findUnique({
        where: { supabaseId: payload.sub },
      });

      if (!user) {
        throw new WsException('Unauthorized: User not found');
      }

      // Attach user to client data for use in gateway
      client.data.user = user;
      return true;
    } catch (e: any) {
      this.logger.error(`WS Auth failed: ${e.message}`);
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization || client.handshake.auth.token;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : authHeader;
  }
}
