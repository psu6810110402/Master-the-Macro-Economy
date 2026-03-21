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
import { TradeResolutionService } from './trade-resolution.service';
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
  private timerIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private gameService: GameService,
    private tradeResolution: TradeResolutionService,
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
    this.server.to(data.sessionId).emit('game:round_start', newState);

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
    
    // Start real-time timer sync
    this.startTimer(data.sessionId, 180);

    this.server.to(data.sessionId).emit('marketOpened', newState);

    return { status: 'ok', roundNumber: newState.currentRound };
  }

  private async startTimer(sessionId: string, seconds: number) {
    if (this.timerIntervals.has(sessionId)) {
      clearInterval(this.timerIntervals.get(sessionId)!);
    }

    const engine = await this.gameService.getOrCreateEngine(sessionId);
    engine.setTimer(seconds);

    const interval = setInterval(async () => {
      const remaining = engine.decrementTimer();
      
      this.server.to(sessionId).emit('game:timer_tick', { secondsLeft: remaining });

      if (remaining <= 0) {
        clearInterval(interval);
        this.timerIntervals.delete(sessionId);
        
        // Auto-lock all uncommitted players
        await this.handleTimerEnd(sessionId);
      }
    }, 1000);

    this.timerIntervals.set(sessionId, interval);
  }

  private async handleTimerEnd(sessionId: string) {
    const engine = await this.gameService.getOrCreateEngine(sessionId);
    const state = engine.getState();
    const players = state.players.filter(p => p.role === 'PLAYER');

    for (const player of players) {
      if (!state.readyPlayers.includes(player.id)) {
        // Fetch their last known valid portfolio or default to 100% cash
        // For simplicity in this build, we'll assume they stay in their current positions
        // and trigger a system commit
        this.logger.log(`Auto-locking player ${player.id} due to timeout`);
      }
    }

    // Trigger round end sequence if everyone is now locked/ready
    const newState = await this.gameService.nextRound(sessionId);
    this.server.to(sessionId).emit('game:round_end', { 
      assetPrices: newState.assetPrices,
      round: newState.currentRound 
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('trade:commit')
  async handleTradeCommit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; allocation: any },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    const state = engine.getState();

    try {
      const record = await this.tradeResolution.commitPortfolio(
        data.sessionId,
        user.id,
        state.currentRound,
        data.allocation,
        state.assetPrices
      );

      engine.setPlayerReady(user.id, true);

      this.server.to(data.sessionId).emit('game:player_ready', {
        userId: user.id,
        readyCount: engine.getState().readyPlayers.length,
        totalCount: engine.getState().players.filter(p => p.role === 'PLAYER').length
      });

      client.emit('trade:confirmed', { 
        totalValue: record.totalValue, 
        round: state.currentRound 
      });

      if (engine.isEveryoneReady()) {
        this.stopTimer(data.sessionId);
        const newState = await this.gameService.nextRound(data.sessionId);
        this.server.to(data.sessionId).emit('game:round_end', { 
          assetPrices: newState.assetPrices,
          round: newState.currentRound 
        });
      }

      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  private stopTimer(sessionId: string) {
    if (this.timerIntervals.has(sessionId)) {
      clearInterval(this.timerIntervals.get(sessionId)!);
      this.timerIntervals.delete(sessionId);
    }
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

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('playerReady')
  async handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; isReady: boolean },
  ) {
    const user = client.data.user;
    if (user.role !== 'PLAYER') {
      return { status: 'error', message: 'Only players can be ready' };
    }

    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    engine.setPlayerReady(user.id, data.isReady);

    // Broadcast updated state (so others see who is ready)
    this.server.to(data.sessionId).emit('playerReadyState', {
      userId: user.id,
      isReady: data.isReady,
      readyPlayers: engine.getState().readyPlayers,
    });

    if (engine.isEveryoneReady()) {
      // Auto-trigger next round if everyone is ready
      const newState = await this.gameService.nextRound(data.sessionId);
      this.server.to(data.sessionId).emit('game:round_start', newState);
      
      const rankings = await this.leaderboardService.getRankings(data.sessionId);
      this.server.to(data.sessionId).emit('leaderboardUpdate', { rankings });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('player:ready_ack')
  async handlePlayerReadyAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; round: number },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    
    // Track that this player has seen the news
    engine.setPlayerNewsAck(user.id, true);

    this.logger.log(`Player ${user.id} acknowledged news for round ${data.round}`);

    // Broadcast update so others (and facilitator) see who is "ready to trade"
    this.server.to(data.sessionId).emit('player:news_ack_state', {
      userId: user.id,
      acknowledged: true,
      totalAck: engine.getState().newsAckPlayers.length
    });

    if (engine.isEveryoneNewsAcked()) {
      // Auto-open market once everyone has seen the news
      const newState = await this.gameService.openMarket(data.sessionId);
      this.startTimer(data.sessionId, 180);
      this.server.to(data.sessionId).emit('marketOpened', newState);
    }
  }
}
