import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../../modules/auth/auth.service';
import { prisma } from '../../prisma';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);
  private supabase;

  constructor(private authService: AuthService) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    let authUser: any = null;

    // 1. Try Local JWT First (For Guests, E2E Tests, and Performance)
    try {
      const payload = (this.authService as any).jwtService.verify(token);
      if (payload) {
        authUser = { id: payload.sub, email: payload.email };
      }
    } catch (e: any) {
      // Local verification failed, try Supabase next
    }

    // 2. Try Supabase Verification Fallback
    if (!authUser) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase verification timeout')), 5000)
        );

        const { data: supaData, error } = await Promise.race([
          this.supabase.auth.getUser(token),
          timeoutPromise
        ]) as any;

        if (supaData?.user && !error) {
          authUser = { id: supaData.user.id, email: supaData.user.email };
        }
      } catch (e: any) {
        this.logger.error(`WS Auth failed (both Local and Supabase): ${e.message}`);
        throw new WsException('Unauthorized: Invalid token');
      }
    }

    try {
      const user = await this.authService.validateUserService(authUser.id, authUser.email || '');
      // Attach user to client data for use in gateway
      client.data.user = user;
      return true;
    } catch (e: any) {
      this.logger.error(`WS User sync failed: ${e.message}`);
      throw new WsException('Unauthorized: Local user profile not synced');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]*)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : authHeader;
  }
}
