import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { SessionModule } from './modules/session/session.module';
import { GameModule } from './modules/game/game.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TradeModule } from './modules/trade/trade.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env', // Looking up to root workspace .env
    }),
    AuthModule,
    AuditModule,
    SessionModule,
    GameModule,
    PortfolioModule,
    TradeModule,
    LeaderboardModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
