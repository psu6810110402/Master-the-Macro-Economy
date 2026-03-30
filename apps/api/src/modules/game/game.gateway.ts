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
import { BlackSwanService } from '../macro-engine/black-swan.service';
import { OnModuleInit } from '@nestjs/common';
import { prisma } from '../../prisma';
import { DEFAULT_ALLOCATION, DEFAULT_100_CASH } from '@hackanomics/engine';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private timerIntervals = new Map<string, NodeJS.Timeout>();
  // Track which session each client belongs to for disconnect handling
  private clientSessions = new Map<string, { sessionId: string; userId: string; displayName: string }>();
  // Store draft allocations for auto-lock fallback
  private draftAllocations = new Map<string, Record<string, number>>();
  // Fix #21: Track player activity for auto-kick
  private lastSeen = new Map<string, number>();

  constructor(
    private gameService: GameService,
    private tradeResolution: TradeResolutionService,
    @Inject(forwardRef(() => LeaderboardService))
    private leaderboardService: LeaderboardService,
    private blackSwanService: BlackSwanService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  onModuleInit() {
    // Fix #21: Inactivity sweeping (runs every minute)
    setInterval(() => this.sweepInactivePlayers(), 60000);
  }

  private async sweepInactivePlayers() {
    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes

    for (const [clientKey, timestamp] of this.lastSeen.entries()) {
      if (now - timestamp > threshold) {
        const [sessionId, userId] = clientKey.split(':');
        this.logger.warn(`Player ${userId} inactive for 5m, auto-dropping.`);
        
        await prisma.sessionPlayer.updateMany({
           where: { sessionId, userId },
           data: { status: 'DROPPED' as any, isActive: false }
        });

        // Notify session
        this.server.to(sessionId).emit('player:dropped', { userId, reason: 'INACTIVITY' });
        await this.emitRosterUpdate(sessionId);
        
        this.lastSeen.delete(clientKey);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Emit roster:update on disconnect
    const session = this.clientSessions.get(client.id);
    if (session) {
      // Don't auto-drop immediately on disconnect, wait for 5m ping timeout
      // but mark as disconnected in the roster visually
      this.lastSeen.set(`${session.sessionId}:${session.userId}`, Date.now()); 
      await this.emitRosterUpdate(session.sessionId);
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

    this.logger.log(`[Gateway] User ${user.id} (${user.role}) joining session room ${data.sessionId}`);

    engine.addPlayer({
      id: user.id,
      displayName: user.displayName || user.firstName || 'Guest',
      role: user.role as any,
    });

    this.server.to(data.sessionId).emit('playerJoined', {
      userId: user.id,
      displayName: user.displayName,
      state: engine.getState(),
    });

    // Emit roster:update on join
    await this.emitRosterUpdate(data.sessionId);
    
    const session = await prisma.gameSession.findUnique({ where: { id: data.sessionId } });

    return { 
      status: 'ok', 
      state: { 
        ...engine.getState(), 
        round: engine.getState().currentRound, // Normalize for frontend
        totalRounds: session?.totalRounds || 5 
      } 
    };
  }

  private async emitRoundStart(sessionId: string, payload: RoundPayload) {
    this.server.to(sessionId).emit('game:round_start', {
      assetPrices: payload.assetPrices,
      round: payload.round,
      news: payload.news,
      macro: payload.macro,
      timer: payload.timer,
      status: 'NEWS_BREAK',
    });

    const rankings = await this.leaderboardService.getRankings(sessionId);
    this.server.to(sessionId).emit('leaderboardUpdate', { rankings });
  }

  public async broadcastStartSession(sessionId: string, payload: RoundPayload) {
    await this.emitRoundStart(sessionId, payload);
  }

  public async broadcastNextRound(sessionId: string, payload: RoundPayload) {
    if (payload.isGameOver) {
      const rankings = await this.leaderboardService.getRankings(sessionId);
      this.server.to(sessionId).emit('sessionEnded', {
        state: payload.state,
        rankings,
        scores: payload.scores,
      });
    } else {
      await this.emitRoundStart(sessionId, payload);
    }
  }

  public async broadcastOpenMarket(sessionId: string, state: any) {
    this.startTimer(sessionId, 180);
    this.server.to(sessionId).emit('marketOpened', {
      assetPrices: state.assetPrices,
      round: state.currentRound,
      timer: 180,
      status: 'ACTIVE',
    });
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

    this.logger.log(`[Gateway] Facilitator ${user.id} starting session ${data.sessionId}`);
    const payload = await this.gameService.startSession(data.sessionId);
    await this.broadcastStartSession(data.sessionId, payload);

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
    await this.broadcastNextRound(data.sessionId, payload);

    return { status: 'ok', roundNumber: payload.round, gameOver: payload.isGameOver || false };
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

    this.logger.log(`[Gateway] Facilitator ${user.id} opening market in session ${data.sessionId}`);
    const newState = await this.gameService.openMarket(data.sessionId);
    await this.broadcastOpenMarket(data.sessionId, newState);
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

  /**
   * Auto-lock all uncommitted players using their draft allocation or a default.
   */
  private async autoLockUncommitted(sessionId: string) {
    const engine = await this.gameService.getOrCreateEngine(sessionId);
    const state = engine.getState();
    const players = state.players.filter(p => p.role === 'PLAYER');
    const defaultAllocation = DEFAULT_ALLOCATION;

    for (const player of players) {
      if (!state.readyPlayers.includes(player.id)) {
        this.logger.log(`Auto-locking player ${player.id} due to timeout/forceSkip`);
        
        const draftKey = `${sessionId}:${player.id}`;
        let allocation = this.draftAllocations.get(draftKey);

        if (!allocation) {
          if (state.currentRound === 1) {
            // Round 1 fallback: 100% CASH
            allocation = DEFAULT_100_CASH;
          } else {
            // Previous round fallback
            const prevRecord = await prisma.tradeRecord.findFirst({
              where: { sessionId, playerId: player.id, round: state.currentRound - 1 }
            });
            if (prevRecord && prevRecord.portfolio) {
              try {
                allocation = JSON.parse(prevRecord.portfolio);
              } catch (e) {
                allocation = DEFAULT_100_CASH;
              }
            } else {
              allocation = DEFAULT_100_CASH;
            }
          }
        }

        try {
          await this.tradeResolution.commitPortfolio(
            sessionId,
            player.id,
            state.currentRound,
            allocation!,
            state.assetPrices,
            true, // isAutoLock
          );
        } catch (err) {
          this.logger.error(`Failed to auto-lock player ${player.id}: ${err}`);
        }

        engine.setPlayerReady(player.id, true);
        this.draftAllocations.delete(draftKey);
      }
    }
  }

  private async advanceRound(sessionId: string) {
    try {
      const payload = await this.gameService.nextRound(sessionId);
      if (payload.isGameOver) {
        const rankings = await this.leaderboardService.getRankings(sessionId);
        this.server.to(sessionId).emit('sessionEnded', {
          state: payload.state,
          rankings,
          scores: payload.scores,
        });
        this.logger.log(`[Gateway] sessionEnded emitted for session ${sessionId}`);
      } else {
        this.server.to(sessionId).emit('game:round_start', {
          assetPrices: payload.assetPrices,
          round: payload.round,
          news: payload.news,
          macro: payload.macro,
          timer: payload.timer,
          status: 'NEWS_BREAK',
        });
        this.logger.log(`[Gateway] auto game:round_start emitted for session ${sessionId} round ${payload.round}`);
      }
    } catch (err) {
      this.logger.error(`[Gateway] advanceRound failed for session ${sessionId}`, err);
      this.server.to(sessionId).emit('game:error', { message: 'Failed to advance to next round' });
    }
  }

  private async handleTimerEnd(sessionId: string) {
    // Auto-lock all uncommitted players with DB persist
    await this.autoLockUncommitted(sessionId);

    const engine = await this.gameService.getOrCreateEngine(sessionId);
    const state = engine.getState();

    // Emit round end, then advance
    this.server.to(sessionId).emit('game:round_end', {
      assetPrices: state.assetPrices,
      round: state.currentRound,
    });

    // Auto-advance to next round
    this.advanceRound(sessionId);
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
    this.logger.log(`[Gateway] trade:commit received for session ${data.sessionId} from ${user.id} (${user.role})`);

    if (!data?.sessionId) {
      return { status: 'error', message: 'Session ID is required' };
    }
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    const state = engine.getState();

    // Double-commit guard
    if (state.readyPlayers.includes(user.id)) {
      return { status: 'error', message: 'Already committed for this round' };
    }

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

      this.logger.log(`[Gateway] Trade committed for user ${user.id} in session ${data.sessionId}. TotalValue: ${record.totalValue}`);

      // Emit roster:update on commit (player status changes to LOCKED)
      await this.emitRosterUpdate(data.sessionId);

      if (engine.isEveryoneReady()) {
        this.stopTimer(data.sessionId);

        // Emit round end; advance happens asynchronously so we can return callback quickly.
        this.server.to(data.sessionId).emit('game:round_end', {
          assetPrices: state.assetPrices,
          round: state.currentRound,
        });

        this.advanceRound(data.sessionId);
      }

      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  // ─── PLAYER PING ──────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('player:ping')
  async handlePlayerPing(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    const user = client.data.user;
    this.lastSeen.set(`${data.sessionId}:${user.id}`, Date.now());
    return { status: 'ok' };
  }

  // ─── TRADE DRAFT UPDATE ────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('trade:update')
  async handleTradeUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; allocation: Record<string, number> },
  ) {
    const user = client.data.user;
    // Store draft in memory for auto-lock fallback
    this.draftAllocations.set(`${data.sessionId}:${user.id}`, data.allocation);
    return { status: 'ok' };
  }

  // ─── FORCE SKIP (Facilitator/Admin) ───────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('forceSkip')
  async handleForceSkip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data.user;
    if (user.role !== 'FACILITATOR' && user.role !== 'ADMIN') {
      return { status: 'error', message: 'Unauthorized' };
    }

    // Stop the timer
    this.stopTimer(data.sessionId);

    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    const state = engine.getState();
    const playerIds = state.players.filter(p => p.role === 'PLAYER').map(p => p.id);
    const missingCount = playerIds.length - state.readyPlayers.length;

    // Auto-lock all uncommitted players
    await this.autoLockUncommitted(data.sessionId);

    if (missingCount > 0) {
      this.logger.log(`Force skip auto-locked ${missingCount} players, emitting round_end.`);
      this.server.to(data.sessionId).emit('game:round_end', { 
        assetPrices: engine.getState().assetPrices,
        round: engine.getState().currentRound,
      });
    }

    // Advance to next round
    const payload = await this.gameService.nextRound(data.sessionId);
    
    if (payload.isGameOver) {
      const rankings = await this.leaderboardService.getRankings(data.sessionId);
      this.server.to(data.sessionId).emit('sessionEnded', {
        state: payload.state,
        rankings,
        scores: payload.scores,
      });
      return { status: 'ok', gameOver: true };
    }

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

    return { status: 'ok', roundNumber: payload.round };
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

    this.logger.log(`[Gateway] Facilitator ${user.id} ending session ${data.sessionId} manually`);
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
      this.server.to(data.sessionId).emit('game:round_end', {
        assetPrices: engine.getState().assetPrices,
        round: engine.getState().currentRound,
      });

      this.advanceRound(data.sessionId);
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

  // ─── ADMIN INJECTIONS ─────────────────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('admin:inject_news')
  async handleAdminInjectNews(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; headline: string; body: string },
  ) {
    const user = client.data.user;
    // Check if facilitator
    const session = await prisma.gameSession.findUnique({ where: { id: data.sessionId } });
    if (!session || session.facilitatorId !== user.id) return;

    this.logger.log(`Facilitator injected custom news: ${data.headline}`);

    // Set status to NEWS_BREAK
    const engine = await this.gameService.getOrCreateEngine(data.sessionId);
    engine.updateStatus('NEWS_BREAK');
    engine.getState().newsAckPlayers = []; // Reset acks

    const customNews = {
      headline: data.headline,
      body: data.body,
      hint: 'Facilitator override event',
      macroDeltas: {}
    };

    const currentMacro = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId: data.sessionId, roundNumber: engine.getState().currentRound } }
    });

    // Broadcast to all players
    this.server.to(data.sessionId).emit('game:round_start', {
      round: engine.getState().currentRound,
      news: customNews,
      macro: currentMacro || {},
      timer: 0,
      status: 'NEWS_BREAK'
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('admin:inject_black_swan')
  async handleAdminInjectBlackSwan(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; eventName: string },
  ) {
    const user = client.data.user;
    const session = await prisma.gameSession.findUnique({ where: { id: data.sessionId } });
    if (!session || session.facilitatorId !== user.id) return;

    this.logger.log(`Facilitator triggered Black Swan: ${data.eventName}`);

    const event = this.blackSwanService.getEventByName(data.eventName);
    const tier = event?.tier || 1;

    // Update macro DB record
    await prisma.macroState.update({
      where: { sessionId_roundNumber: { sessionId: data.sessionId, roundNumber: session.roundNumber } },
      data: {
        blackSwanActive: true,
        blackSwanEvent: data.eventName,
        blackSwanTier: tier,
      }
    });

    // Notify clients to show extreme UI/alarms instantly if needed
    this.server.to(data.sessionId).emit('game:black_swan_triggered', {
      eventName: data.eventName,
      tier,
    });
  }
}
