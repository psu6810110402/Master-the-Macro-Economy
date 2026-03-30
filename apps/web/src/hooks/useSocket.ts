'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from '@/context/SessionContext';

export const useSocket = (sessionId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ event: string; data: any } | null>(null);
  const { token } = useSession();

  useEffect(() => {
    if (!sessionId) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to Game Gateway');
      
      // Request to join the session and handle initial state restoration
      socket.emit('joinSession', { sessionId }, (response: any) => {
        if (response?.status === 'ok' && response.state) {
          setLastEvent({ event: 'initialState', data: response.state });
        }
      });
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('Disconnected from Game Gateway:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      if (error.message === 'xhr poll error') {
        console.warn('Is the API server running at', SOCKET_URL, '?');
      }
    });

    // Central listener for ALL game events
    const events = [
      // Round lifecycle
      'game:round_start',
      'game:round_end',
      'game:timer_tick',
      // Player state
      'game:player_ready',
      'playerJoined',
      'playerReadyState',
      'player:news_ack_state',
      // Market & Trading
      'marketOpened',
      'trade:confirmed',
      'tradeAcknowledged',
      // Portfolio & Leaderboard
      'portfolioUpdate',
      'marketUpdate',
      'leaderboardUpdate',
      // Session
      'sessionEnded',
      'roster:update',
      'player:dropped',
    ];

    events.forEach(event => {
      socket.on(event, (data) => {
        setLastEvent({ event, data });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, token]);

  const emit = useCallback((event: string, data: any, callback?: (response: any) => void) => {
    socketRef.current?.emit(event, data, callback);
  }, []);

  return { isConnected, lastEvent, emit, socket: socketRef };
};
