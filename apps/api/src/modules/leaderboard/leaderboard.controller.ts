import { Controller, Get, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':sessionId')
  getRankings(@Param('sessionId') sessionId: string) {
    return this.leaderboardService.getRankings(sessionId);
  }
}
