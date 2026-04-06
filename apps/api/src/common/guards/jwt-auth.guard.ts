import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private supabase;

  constructor(private authService: AuthService) {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authorization token found');
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
        // Add a timeout to prevent infinite hangs on flaky network
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase verification timeout')), 5000)
        );

        const { data, error } = await Promise.race([
          this.supabase.auth.getUser(token),
          timeoutPromise
        ]) as any;

        if (data?.user && !error) {
          authUser = { id: data.user.id, email: data.user.email };
        }
      } catch (e: any) {
        console.error('JwtAuthGuard: token verification failed (both Local and Supabase)', e?.message);
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    // Attach user to request
    try {
      const localUser = await this.authService.validateUserService(authUser.id, authUser.email || '');
      request.user = localUser;
    } catch (e) {
      console.error('Failed to resolve local user profile', e);
      throw new UnauthorizedException('Please register your profile first');
    }

    return true;
  }

  private extractToken(request: any): string | null {
    // 1. Check Authorization Header
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // 2. Check Query Parameter (for WebSockets)
    const queryToken = request.query?.token;
    if (queryToken) return queryToken;

    // 3. Check handshake query (Socket.io)
    const handshakeToken = request.handshake?.query?.token;
    if (handshakeToken) return handshakeToken;

    // 4. Check Cookie (for Web Browsers / E2E)
    const cookieToken = request.cookies?.jwt;
    if (cookieToken) return cookieToken;

    return null;
  }
}
