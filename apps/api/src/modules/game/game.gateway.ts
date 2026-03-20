import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { GameService } from './game.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private gameService: GameService,
    @Inject(forwardRef(() => LeaderboardService))
    private leaderboardService: LeaderboardService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);

    client.join(data.sessionId);
    
    engine.addPlayer({
      id: user.id,
      displayName: user.displayName,
      role: user.role,
    });

    this.server.to(data.sessionId).emit('playerJoined', {
      userId: user.id,
      displayName: user.displayName,
      state: engine.getState(),
    });

    return { status: 'ok', state: engine.getState() };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('nextRound')
  async handleNextRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    // Only FACILITATOR or ADMIN can trigger next round
    if (user.role !== 'FACILITATOR' && user.role !== 'ADMIN') {
      return { status: 'error', message: 'Unauthorized' };
    }

    const newState = await this.gameService.nextRound(data.sessionId);
    
    // Broadcast new state including new market prices and round summary to all session participants
    this.server.to(data.sessionId).emit('roundStarted', newState);

    // Also broadcast live leaderboard rankings
    const rankings = await this.leaderboardService.getRankings(data.sessionId);
    this.server.to(data.sessionId).emit('leaderboardUpdate', { rankings });

    return { status: 'ok', roundNumber: newState.currentRound };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('openMarket')
  async handleOpenMarket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    if (user.role !== 'FACILITATOR' && user.role !== 'ADMIN') {
      return { status: 'error', message: 'Unauthorized' };
    }

    const newState = await this.gameService.openMarket(data.sessionId);
    
    this.server.to(data.sessionId).emit('marketOpened', newState);

    return { status: 'ok', roundNumber: newState.currentRound };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('submitTrade')
  async handleTrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; trade: any },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);

    engine.processTrade(user.id, data.trade);

    // Broadcast update or acknowledgement
    this.server.to(data.sessionId).emit('tradeAcknowledged', {
      userId: user.id,
      trade: data.trade,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('endSession')
  async handleEndSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    if (user.role !== 'FACILITATOR' && user.role !== 'ADMIN') {
      return { status: 'error', message: 'Unauthorized' };
    }

    const finalState = await this.gameService.endSession(data.sessionId);
    const rankings = await this.leaderboardService.getRankings(data.sessionId);

    this.server.to(data.sessionId).emit('sessionEnded', {
      state: finalState,
      rankings,
    });

    return { status: 'ok' };
  }
}
