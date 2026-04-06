import { Module } from '@nestjs/common';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { GameServerlessModule } from '../game/game-serverless.module';

@Module({
  imports: [GameServerlessModule],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradeServerlessModule {}
