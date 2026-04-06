/**
 * Serverless-safe AppModule for Vercel deployment.
 * Excludes GameGateway (WebSocket) which requires a persistent TCP port.
 * REST endpoints work fully; real-time WebSocket requires Railway/Render.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { SessionServerlessModule } from './modules/session/session-serverless.module';
import { GameServerlessModule } from './modules/game/game-serverless.module';
import { PortfolioServerlessModule } from './modules/portfolio/portfolio-serverless.module';
import { TradeServerlessModule } from './modules/trade/trade-serverless.module';
import { LeaderboardServerlessModule } from './modules/leaderboard/leaderboard-serverless.module';
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
      { name: 'default', ttl: 60000, limit: 120 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),
    AuthModule,
    AuditModule,
    SessionServerlessModule,
    GameServerlessModule,
    PortfolioServerlessModule,
    TradeServerlessModule,
    LeaderboardServerlessModule,
    MacroEngineModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppServerlessModule {}
