/**
 * Serverless-safe GameModule — provides GameService and MarketService
 * without GameGateway (which requires a persistent TCP port).
 */
import { Module, forwardRef } from '@nestjs/common';
import { GameService } from './game.service';
import { MarketService } from './market.service';
import { TradeResolutionService } from './trade-resolution.service';
import { GameController } from './game.controller';
import { LeaderboardServerlessModule } from '../leaderboard/leaderboard-serverless.module';
import { MacroEngineModule } from '../macro-engine/macro-engine.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => LeaderboardServerlessModule),
    MacroEngineModule,
    AuditModule,
  ],
  controllers: [GameController],
  providers: [GameService, MarketService, TradeResolutionService],
  exports: [GameService, MarketService, TradeResolutionService],
})
export class GameServerlessModule {}
