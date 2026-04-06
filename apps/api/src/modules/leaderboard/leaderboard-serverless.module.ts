import { Module, forwardRef } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { GameServerlessModule } from '../game/game-serverless.module';

@Module({
  imports: [forwardRef(() => GameServerlessModule)],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardServerlessModule {}
