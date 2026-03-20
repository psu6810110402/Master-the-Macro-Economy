import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MarketService } from './market.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { GameController } from './game.controller';

@Module({
  imports: [
    forwardRef(() => LeaderboardModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [GameController],
  providers: [GameGateway, GameService, MarketService],
  exports: [GameService, MarketService],
})
export class GameModule {}
