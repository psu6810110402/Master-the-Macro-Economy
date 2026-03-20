import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@hackanomics/database';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

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
      displayName: user.displayName 
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async createGuestUser(role: string = 'PLAYER') {
    const guestId = Math.random().toString(36).substring(7);
    const email = `guest_${guestId}@hackanomics.dev`;
    
    const user = await prisma.user.create({
      data: {
        supabaseId: `guest_${guestId}`,
        email,
        displayName: `Guest ${guestId.toUpperCase()}`,
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    
    // Generate a pseudo-supabaseId for internal consistency if not using real Supabase
    const internalId = Math.random().toString(36).substring(7);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        supabaseId: `local_${internalId}`,
        role: dto.role || 'PLAYER',
      },
    });

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
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }
}
