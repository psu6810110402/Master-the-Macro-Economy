import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { prisma } from '../../prisma';

@Injectable()
export class AdminService {
  
  async getSystemUsers() {
    // 1. Fetch Staff (ADMIN, FACILITATOR)
    const staff = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'FACILITATOR'] } },
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
    });

    // 2. Fetch Sessions and their nested Players
    const sessionsWithPlayers = await prisma.gameSession.findMany({
      include: {
        players: {
          include: {
            user: {
              select: { id: true, email: true, displayName: true, role: true }
            },
            portfolio: {
              select: { totalValue: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      staff,
      sessions: sessionsWithPlayers,
    };
  }

  async testSupabaseConnection() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new InternalServerErrorException('Supabase environment variables (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY) are missing on the server.');
    }

    try {
      // Secure server-side ping using env keys only (mitigates SSRF)
      const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { status: 'SUCCESS', message: 'Successfully connected to Supabase REST API.', url: supabaseUrl };
      } else {
        return { status: 'FAIL', message: `Supabase returned HTTP ${response.status}`, url: supabaseUrl };
      }
    } catch (error: any) {
      return { status: 'ERROR', message: error.message, url: supabaseUrl };
    }
  }
}
