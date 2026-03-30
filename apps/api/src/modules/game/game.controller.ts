import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { prisma } from '../../prisma';

@Controller('game')
export class GameController {
  @Get('assets')
  @UseGuards(JwtAuthGuard)
  async getAssets(@Query('sessionId') sessionIdParam?: string) {
    const assets = await prisma.asset.findMany({ where: { isActive: true } });
    
    // If we have a session context, try to find the absolute latest prices for this simulation
    if (sessionIdParam) {
      const latestPrices = await prisma.assetPrice.findMany({
        where: { sessionId: sessionIdParam },
        orderBy: { recordedAt: 'desc' },
        distinct: ['assetId'],
      });

      return assets.map(asset => {
        const priceRecord = latestPrices.find(p => p.assetId === asset.id);
        return {
          ...asset,
          price: priceRecord ? Number(priceRecord.price) : asset.basePrice,
          change: priceRecord ? Number(priceRecord.delta) : 0,
        };
      });
    }

    return assets.map(a => ({ ...a, price: a.basePrice, change: 0 }));
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
