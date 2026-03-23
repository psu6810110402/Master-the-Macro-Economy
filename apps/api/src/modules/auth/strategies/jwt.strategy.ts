import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const cookieExtractor = (req: any) => {
      let token = null;
      if (req && req.cookies) {
        token = req.cookies['jwt'];
      }
      return token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    };

    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const supabaseId = payload.sub;
    const email = payload.email;

    try {
      const user = await this.authService.validateUserService(supabaseId, email);
      return user;
    } catch (error) {
      throw new UnauthorizedException('Failed to validate or provision user profile.');
    }
  }
}
