import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';
import { prisma } from '../../prisma';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':sessionId')
  @UseGuards(JwtAuthGuard)
  async getRankings(@CurrentUser() user: any, @Param('sessionId') sessionId: string) {
    // SECURITY: Ensure the user is a participant of this session OR a facilitator
    const sessionPlayer = await prisma.sessionPlayer.findUnique({
      where: { sessionId_userId: { sessionId, userId: user.id } },
    });

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!sessionPlayer && session?.facilitatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You are not a participant of this session');
    }

    return this.leaderboardService.getRankings(sessionId);
  }
}
