import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';

@Controller('session')
export class SessionController {
  constructor(private sessionService: SessionService) {}

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
    return this.sessionService.startSession(id);
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
    return this.sessionService.nextRound(id);
  }

  @Post(':id/open-market')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async openMarket(@Param('id') id: string) {
    return this.sessionService.openMarket(id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  async endSession(@Param('id') id: string) {
    return this.sessionService.endSession(id);
  }
}
