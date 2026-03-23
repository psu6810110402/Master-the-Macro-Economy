import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MacroEngineService } from './macro-engine.service';
import { OverrideMacroDto } from './dto/macro-state.dto';
import { prisma } from '../../prisma';

@Controller('game/macro')
export class MacroEngineController {
  constructor(private macroEngine: MacroEngineService) {}

  @Get(':sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR', 'PLAYER')
  async getMacroState(@Param('sessionId') sessionId: string) {
    return this.macroEngine.getLatestMacroState(sessionId);
  }

  @Patch(':sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async updateMacroState(
    @Param('sessionId') sessionId: string,
    @Body() dto: OverrideMacroDto
  ) {
    // Get active round
    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) return null;

    return prisma.macroState.update({
      where: { 
        sessionId_roundNumber: { 
          sessionId, 
          roundNumber: session.roundNumber 
        } 
      },
      data: dto,
    });
  }
}
