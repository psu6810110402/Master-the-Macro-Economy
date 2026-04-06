import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@hackanomics/database';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { prisma } from '../../prisma';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    public readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUserService(supabaseId: string, email: string) {
    // Look up user internally
    let user = await prisma.user.findUnique({
      where: { supabaseId },
    });
    
    // If this is a first-time login from Supabase Auth, we autocreate their local profile
    if (!user) {
       user = await prisma.user.create({
         data: {
           supabaseId,
           email,
           firstName: email.split('@')[0],
           lastName: '',
           displayName: email.split('@')[0], 
         }
       });
    }
    return user;
  }

  async generateToken(user: any) {
    const payload = { 
      sub: user.supabaseId, 
      email: user.email, 
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async createGuestUser(role: UserRole = UserRole.PLAYER, firstName: string = 'Guest', lastName?: string) {
    const guestId = randomUUID();
    const email = `guest_${guestId.substring(0, 8)}@hackanomics.dev`;
    const resolvedLastName = lastName || guestId.substring(0, 6);
    
    const user = await prisma.user.create({
      data: {
        supabaseId: guestId,
        email,
        firstName,
        lastName: resolvedLastName,
        displayName: `${firstName} ${resolvedLastName}`.trim(),
        role,
      }
    });

    return this.generateToken(user);
  }

  async register(dto: RegisterDto) {
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const validatedSupabaseId = (dto as any).supabaseId || randomUUID();

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        supabaseId: validatedSupabaseId,
        // Only allow PLAYER role on self-registration; role elevation done by admins separately
        role: UserRole.PLAYER,
      },
    });

    this.logger.log(`[Auth] User registered: ${user.email} with role ${user.role}`);
    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.logger.warn(`[Auth] Failed login attempt for ${dto.email}: Invalid password`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`[Auth] User logged in: ${user.email} (${user.role})`);
    return this.generateToken(user);
  }
}
