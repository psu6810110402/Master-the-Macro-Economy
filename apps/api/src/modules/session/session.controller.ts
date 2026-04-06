import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Param, Logger, Optional } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { GameGateway } from '../game/game.gateway';

@Controller('session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(
    private sessionService: SessionService,
    @Optional() private gameGateway: GameGateway | null,
  ) {}
  @Get('facilitator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async getFacilitatorSessions(@CurrentUser() user: any) {
    return this.sessionService.getSessionsByFacilitator(user.id);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllSessions() {
    return this.sessionService.getAllSessions();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async createSession(@CurrentUser() user: any, @Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(user.id, dto.name, dto.maxPlayers, dto.scenarioId, dto.format);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async joinSession(@CurrentUser() user: any, @Body() dto: JoinSessionDto) {
    return this.sessionService.joinSession(user.id, dto.code);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async startSession(@Param('id') id: string) {
    console.log(`[SessionController] startSession REST called for ${id}`);
    const payload = await this.sessionService.startSession(id);
    console.log(`[SessionController] startSession payload round=${(payload as any).round}`);
    await this.gameGateway?.broadcastStartSession(id, payload as any);
    console.log(`[SessionController] broadcastStartSession emitted`);
    return payload;
  }

  @Post(':id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async pauseSession(@Param('id') id: string) {
    return this.sessionService.pauseSession(id);
  }

  @Post(':id/next-round')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async nextRound(@Param('id') id: string) {
    try {
      this.logger.log(`SessionController: nextRound called for ${id}`);
      const payload = await this.sessionService.nextRound(id);
      this.logger.log(`SessionController: nextRound success for ${id}, broadcasting...`);
      await this.gameGateway?.broadcastNextRound(id, payload as any);
      return payload;
    } catch (err) {
      this.logger.error(`[SessionController] nextRound error for ${id}`, err);
      throw err;
    }
  }

  @Post(':id/open-market')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async openMarket(@Param('id') id: string) {
    this.logger.log(`SessionController: openMarket called for ${id}`);
    const payload = await this.sessionService.openMarket(id);
    this.logger.log(`SessionController: openMarket success for ${id}, broadcasting...`);
    await this.gameGateway?.broadcastOpenMarket(id, payload as any);
    return payload;
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async endSession(@Param('id') id: string) {
    return this.sessionService.endSession(id);
  }
}
