import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { SessionModule } from './modules/session/session.module';
import { GameModule } from './modules/game/game.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TradeModule } from './modules/trade/trade.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { MacroEngineModule } from './modules/macro-engine/macro-engine.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,   // 1 minute window
        limit: 120,   // 120 requests per minute (general API)
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,    // 10 login/register attempts per minute
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    AuditModule,
    SessionModule,
    GameModule,
    PortfolioModule,
    TradeModule,
    LeaderboardModule,
    MacroEngineModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    // Apply ThrottlerGuard globally to all REST endpoints
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
