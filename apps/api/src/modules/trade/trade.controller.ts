import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@hackanomics/database';
import { TradeService } from './trade.service';
import { CreateTradeDto } from './dto/create-trade.dto';

@Controller('trade')
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @Post('execute')
  @UseGuards(JwtAuthGuard)
  async executeTrade(
    @CurrentUser() user: User,
    @Body() dto: CreateTradeDto,
  ) {
    return this.tradeService.executeTrade(user.id, dto);
  }
}
