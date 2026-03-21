import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaClient } from '@hackanomics/database';

const prisma = new PrismaClient();

@Controller('game')
export class GameController {
  @Get('assets')
  @UseGuards(JwtAuthGuard)
  async getAssets() {
    return prisma.asset.findMany({
      where: { isActive: true },
    });
  }

  @Get('macro/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getMacroState(@Param('sessionId') sessionId: string) {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId }
    });
    if (!session) return {};

    let state = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: session.roundNumber } }
    });

    if (!state) {
      state = await prisma.macroState.create({
        data: {
          sessionId,
          roundNumber: session.roundNumber,
          interestRate: 2.5,
          inflation: 3.0,
          gdpGrowth: 2.8,
          volatility: 0.3,
        }
      });
    }
    return state;
  }

  @Patch('macro/:sessionId')
  @UseGuards(JwtAuthGuard)
  async updateMacroState(@Param('sessionId') sessionId: string, @Body() data: any) {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId }
    });
    if (!session) return {};

    return prisma.macroState.update({
      where: { sessionId_roundNumber: { sessionId, roundNumber: session.roundNumber } },
      data,
    });
  }
}
