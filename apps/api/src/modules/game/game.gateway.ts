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
import { GameService, RoundPayload } from './game.service';
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
  // Track which session each client belongs to for disconnect handling
  private clientSessions = new Map<string, { sessionId: string; userId: string; displayName: string }>();

  constructor(
    private gameService: GameService,
    private tradeResolution: TradeResolutionService,
    @Inject(forwardRef(() => LeaderboardService))
    private leaderboardService: LeaderboardService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Emit roster:update on disconnect
    const session = this.clientSessions.get(client.id);
    if (session) {
      try {
        const engine = await this.gameService.getOrCreateEngine(session.sessionId);
        const state = engine.getState();
        const rosterPlayers = state.players
          .filter(p => p.role === 'PLAYER')
          .map(p => ({
            id: p.id,
            name: p.displayName,
            isConnected: this.isPlayerConnected(session.sessionId, p.id),
            isLocked: state.readyPlayers.includes(p.id),
          }));

        this.server.to(session.sessionId).emit('roster:update', { players: rosterPlayers });
      } catch (err) {
        this.logger.error(`Error handling disconnect for ${client.id}: ${err}`);
      }
      this.clientSessions.delete(client.id);
    }
  }

  /**
   * Check if a player has at least one connected socket in a room.
   */
  private isPlayerConnected(sessionId: string, userId: string): boolean {
    for (const [, data] of this.clientSessions.entries()) {
      if (data.sessionId === sessionId && data.userId === userId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Build & emit the roster for a session.
   */
  private async emitRosterUpdate(sessionId: string) {
    try {
      const engine = await this.gameService.getOrCreateEngine(sessionId);
      const state = engine.getState();
      const rosterPlayers = state.players
        .filter(p => p.role === 'PLAYER')
        .map(p => ({
          id: p.id,
          name: p.displayName,
          isConnected: this.isPlayerConnected(sessionId, p.id),
          isLocked: state.readyPlayers.includes(p.id),
        }));

      this.server.to(sessionId).emit('roster:update', { players: rosterPlayers });
    } catch (err) {
      this.logger.error(`Error emitting roster update: ${err}`);
    }
  }

  // ─── JOIN SESSION ─────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);

    client.join(data.sessionId);
    
    // Track client→session mapping for disconnect handling
    this.clientSessions.set(client.id, {
      sessionId: data.sessionId,
      userId: user.id,
      displayName: user.displayName,
    });

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

    // Emit roster:update on join
    await this.emitRosterUpdate(data.sessionId);

    return { status: 'ok', state: engine.getState() };
  }

  // ─── START SESSION ────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startSession')
  async handleStartSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    if (user.role !== 'FACILITATOR' && user.role !== 'ADMIN') {
      return { status: 'error', message: 'Unauthorized' };
    }

    const payload = await this.gameService.startSession(data.sessionId);
    
    // Broadcast structured payload to all session members
    this.server.to(data.sessionId).emit('game:round_start', {
      assetPrices: payload.assetPrices,
      round: payload.round,
      news: payload.news,
      macro: payload.macro,
      timer: payload.timer,
      status: 'NEWS_BREAK',
    });

    return { status: 'ok', round: payload.round };
  }

  // ─── NEXT ROUND ───────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('nextRound')
  async handleNextRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    if (user.role !== 'FACILITATOR' && user.role !== 'ADMIN') {
      return { status: 'error', message: 'Unauthorized' };
    }

    const payload = await this.gameService.nextRound(data.sessionId);
    
    if (payload.isGameOver) {
      // Game is over — emit sessionEnded with scores + rankings
      const rankings = await this.leaderboardService.getRankings(data.sessionId);
      this.server.to(data.sessionId).emit('sessionEnded', {
        state: payload.state,
        rankings,
        scores: payload.scores,
      });
      return { status: 'ok', gameOver: true };
    }

    // Broadcast new round with enriched payload
    this.server.to(data.sessionId).emit('game:round_start', {
      assetPrices: payload.assetPrices,
      round: payload.round,
      news: payload.news,
      macro: payload.macro,
      timer: payload.timer,
      status: 'NEWS_BREAK',
    });

    // Also broadcast leaderboard
    const rankings = await this.leaderboardService.getRankings(data.sessionId);
    this.server.to(data.sessionId).emit('leaderboardUpdate', { rankings });

    return { status: 'ok', roundNumber: payload.round };
  }

  // ─── OPEN MARKET ──────────────────────────────────────────────

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

    this.server.to(data.sessionId).emit('marketOpened', {
      assetPrices: newState.assetPrices,
      round: newState.currentRound,
      timer: 180,
      status: 'ACTIVE',
    });

    return { status: 'ok', roundNumber: newState.currentRound };
  }

  // ─── TIMER MANAGEMENT ─────────────────────────────────────────

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
        
        // Auto-lock all uncommitted players and advance
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
        this.logger.log(`Auto-locking player ${player.id} due to timeout`);
        engine.setPlayerReady(player.id, true);
      }
    }

    // Emit round end, then advance
    this.server.to(sessionId).emit('game:round_end', { 
      assetPrices: state.assetPrices,
      round: state.currentRound,
    });

    // Auto-advance to next round
    const payload = await this.gameService.nextRound(sessionId);
    
    if (payload.isGameOver) {
      const rankings = await this.leaderboardService.getRankings(sessionId);
      this.server.to(sessionId).emit('sessionEnded', {
        state: payload.state,
        rankings,
        scores: payload.scores,
      });
    } else {
      this.server.to(sessionId).emit('game:round_start', {
        assetPrices: payload.assetPrices,
        round: payload.round,
        news: payload.news,
        macro: payload.macro,
        timer: payload.timer,
        status: 'NEWS_BREAK',
      });
    }
  }

  private stopTimer(sessionId: string) {
    if (this.timerIntervals.has(sessionId)) {
      clearInterval(this.timerIntervals.get(sessionId)!);
      this.timerIntervals.delete(sessionId);
    }
  }

  // ─── TRADE COMMIT ─────────────────────────────────────────────

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

      // Emit roster:update on commit (player status changes to LOCKED)
      await this.emitRosterUpdate(data.sessionId);

      if (engine.isEveryoneReady()) {
        this.stopTimer(data.sessionId);

        // Emit round end
        this.server.to(data.sessionId).emit('game:round_end', {
          assetPrices: state.assetPrices,
          round: state.currentRound,
        });

        // Auto-advance to next round
        const payload = await this.gameService.nextRound(data.sessionId);
        
        if (payload.isGameOver) {
          const rankings = await this.leaderboardService.getRankings(data.sessionId);
          this.server.to(data.sessionId).emit('sessionEnded', {
            state: payload.state,
            rankings,
            scores: payload.scores,
          });
        } else {
          this.server.to(data.sessionId).emit('game:round_start', {
            assetPrices: payload.assetPrices,
            round: payload.round,
            news: payload.news,
            macro: payload.macro,
            timer: payload.timer,
            status: 'NEWS_BREAK',
          });
        }
      }

      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  // ─── LEGACY TRADE (kept for backward compat) ──────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('submitTrade')
  async handleTrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; trade: any },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);

    engine.processTrade(user.id, data.trade);

    this.server.to(data.sessionId).emit('tradeAcknowledged', {
      userId: user.id,
      trade: data.trade,
    });
  }

  // ─── END SESSION ──────────────────────────────────────────────

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

    const payload = await this.gameService.endSession(data.sessionId);
    const rankings = await this.leaderboardService.getRankings(data.sessionId);

    this.server.to(data.sessionId).emit('sessionEnded', {
      state: payload.state,
      rankings,
      scores: payload.scores,
    });

    return { status: 'ok' };
  }

  // ─── PLAYER READY ─────────────────────────────────────────────

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

    this.server.to(data.sessionId).emit('playerReadyState', {
      userId: user.id,
      isReady: data.isReady,
      readyPlayers: engine.getState().readyPlayers,
    });

    // Roster update (LOCKED status changed)
    await this.emitRosterUpdate(data.sessionId);

    if (engine.isEveryoneReady()) {
      const payload = await this.gameService.nextRound(data.sessionId);

      if (payload.isGameOver) {
        const rankings = await this.leaderboardService.getRankings(data.sessionId);
        this.server.to(data.sessionId).emit('sessionEnded', {
          state: payload.state,
          rankings,
          scores: payload.scores,
        });
      } else {
        this.server.to(data.sessionId).emit('game:round_start', {
          assetPrices: payload.assetPrices,
          round: payload.round,
          news: payload.news,
          macro: payload.macro,
          timer: payload.timer,
          status: 'NEWS_BREAK',
        });

        const rankings = await this.leaderboardService.getRankings(data.sessionId);
        this.server.to(data.sessionId).emit('leaderboardUpdate', { rankings });
      }
    }
  }

  // ─── NEWS ACK ─────────────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('player:ready_ack')
  async handlePlayerReadyAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; round: number },
  ) {
    const user = client.data.user;
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    
    engine.setPlayerNewsAck(user.id, true);

    this.logger.log(`Player ${user.id} acknowledged news for round ${data.round}`);

    this.server.to(data.sessionId).emit('player:news_ack_state', {
      userId: user.id,
      acknowledged: true,
      totalAck: engine.getState().newsAckPlayers.length,
      totalPlayers: engine.getState().players.filter(p => p.role === 'PLAYER').length,
    });

    if (engine.isEveryoneNewsAcked()) {
      // Auto-open market once everyone has seen the news
      const newState = await this.gameService.openMarket(data.sessionId);
      this.startTimer(data.sessionId, 180);
      this.server.to(data.sessionId).emit('marketOpened', {
        assetPrices: newState.assetPrices,
        round: newState.currentRound,
        timer: 180,
        status: 'ACTIVE',
      });
    }
  }
}
