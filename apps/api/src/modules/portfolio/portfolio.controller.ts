import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  @Get(':sessionId')
  @UseGuards(JwtAuthGuard)
  async getPortfolio(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.portfolioService.getPortfolio(user.id, sessionId);
  }

  @Get(':sessionId/analysis')
  @UseGuards(JwtAuthGuard)
  async getAnalysis(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.portfolioService.generateAnalysis(user.id, sessionId);
  }
}
