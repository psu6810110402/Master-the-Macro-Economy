import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MarketService } from './market.service';
import { TradeResolutionService } from './trade-resolution.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { GameController } from './game.controller';
import { MacroEngineModule } from '../macro-engine/macro-engine.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => LeaderboardModule),
    MacroEngineModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [GameController],
  providers: [GameGateway, GameService, MarketService, TradeResolutionService],
  exports: [GameService, MarketService, TradeResolutionService],
})
export class GameModule {}
