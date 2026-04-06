import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { GameServerlessModule } from '../game/game-serverless.module';

@Module({
  imports: [GameServerlessModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioServerlessModule {}
