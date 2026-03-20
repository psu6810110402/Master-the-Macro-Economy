import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
