import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001';
const ROUNDS = 5;

// 7 asset classes, must sum to 100
const ALLOCATION = {
  TECH: 20,
  INDUSTRIAL: 15,
  CONSUMER: 15,
  BOND: 15,
  GOLD: 15,
  CRYPTO: 10,
  CASH: 10,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function createGuest(role: string, first: string, last: string) {
  const res = await axios.post(`${API_URL}/auth/guest`, { role, firstName: first, lastName: last });
  const cookie = res.headers['set-cookie']?.[0];
  const token = cookie?.split('jwt=')[1]?.split(';')[0];
  if (!token) throw new Error(`Failed to extract JWT for guest ${first} ${last}`);
  return { token };
}

async function connectAndJoin(token: string, sessionId: string): Promise<Socket> {
  const socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', err => reject(err));
  });

  // Emit joinSession so the server knows which room this socket belongs to
  await new Promise<void>((resolve, reject) => {
    socket.emit('joinSession', { sessionId }, (response: any) => {
      if (response?.status === 'ok') {
        resolve();
      } else {
        reject(new Error(`joinSession failed: ${JSON.stringify(response)}`));
      }
    });
  });

  return socket;
}

function waitForEvent(socket: Socket, event: string, timeoutMs = 15_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for '${event}'`)), timeoutMs);
    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runE2E() {
  console.log('🚀 Starting Full 5-Round E2E Simulation...');
  const sockets: Socket[] = [];

  try {
    // 1. Create actors
    const facilitator = await createGuest('FACILITATOR', 'Fac', 'Boss');
    const player1 = await createGuest('PLAYER', 'Alpha', 'One');
    const player2 = await createGuest('PLAYER', 'Beta', 'Two');
    console.log('✅ Actors Ready');

    // 2. Create session
    const sessionRes = await axios.post(
      `${API_URL}/session/create`,
      { name: 'E2E Stability Test', maxPlayers: 5 },
      { headers: { Authorization: `Bearer ${facilitator.token}` } },
    );
    const session = sessionRes.data;
    const sessionId: string = session.id;
    const sessionCode: string = session.code;
    console.log(`✅ Session Created: ${sessionCode} (${sessionId})`);

    // 3. Players join via REST then connect via WebSocket
    await axios.post(
      `${API_URL}/session/join`,
      { code: sessionCode },
      { headers: { Authorization: `Bearer ${player1.token}` } },
    );
    await axios.post(
      `${API_URL}/session/join`,
      { code: sessionCode },
      { headers: { Authorization: `Bearer ${player2.token}` } },
    );

    const sPlayer1 = await connectAndJoin(player1.token, sessionId);
    const sPlayer2 = await connectAndJoin(player2.token, sessionId);

  sPlayer1.on('game:round_start', (data) => {
    console.log('player1 round_start', data);
  });
  sPlayer2.on('game:round_start', (data) => {
    console.log('player2 round_start', data);
  });
  sPlayer1.on('trade:confirmed', (data) => {
    console.log('player1 trade:confirmed', data);
  });
  sPlayer2.on('trade:confirmed', (data) => {
    console.log('player2 trade:confirmed', data);
  });


    // 4. Game loop
    for (let round = 1; round <= ROUNDS; round++) {
      console.log(`\n--- ROUND ${round} ---`);

      // We wait for round_start event if it's NOT the first round (which is triggered by REST)
      // Actually, let's always wait for it to be sure we are in the correct round state.
      const roundStartPromise = Promise.all([
        waitForEvent(sPlayer1, 'game:round_start', 30_000),
        waitForEvent(sPlayer2, 'game:round_start', 30_000),
      ]);

      if (round === 1) {
        await axios.post(
          `${API_URL}/session/${sessionId}/start`,
          {},
          { headers: { Authorization: `Bearer ${facilitator.token}` } },
        );
        console.log('🔔 Round 1 triggered via REST start');
      } else {
        // The gateway may auto-advance when all players commit.
        // If we don't see round_start, we can explicitly call next-round as fallback.
        console.log('🔔 Waiting for auto-advance from previous round...');
      }

      const roundStartData = await roundStartPromise;
      console.log(`✅ Round ${round} started on server (Current: ${roundStartData[0].round})`);

      if (roundStartData[0].round !== round) {
        console.warn(`⚠️ Round mismatch! Expected ${round}, got ${roundStartData[0].round}`);
      }

      // Wait a short moment for market to open (facilitator auto-open logic or manual)
      // In this test, we might need to manually open market if it's NEWS_BREAK
      if (roundStartData[0].status === 'NEWS_BREAK') {
        console.log('🔔 Opening market via REST...');
        await axios.post(
          `${API_URL}/session/${sessionId}/open-market`,
          {},
          { headers: { Authorization: `Bearer ${facilitator.token}` } },
        );
      }

      await waitForEvent(sPlayer1, 'marketOpened', 10_000);

      const commitData = { sessionId, allocation: ALLOCATION };

      // Start waiting for trade confirmations before sending commit events.
      const confirmationPromise = Promise.all([
        waitForEvent(sPlayer1, 'trade:confirmed', 15_000),
        waitForEvent(sPlayer2, 'trade:confirmed', 15_000),
      ]);

      const commitCallbackPromise = Promise.all([
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('player1 commit callback missing')), 15_000);
          sPlayer1.emit('trade:commit', commitData, (resp: any) => {
            clearTimeout(timer);
            console.log('player1 commit callback', resp);
            if (resp?.status === 'ok') resolve(); else reject(new Error(`player1 commit failed: ${JSON.stringify(resp)}`));
          });
        }),
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('player2 commit callback missing')), 15_000);
          sPlayer2.emit('trade:commit', commitData, (resp: any) => {
            clearTimeout(timer);
            console.log('player2 commit callback', resp);
            if (resp?.status === 'ok') resolve(); else reject(new Error(`player2 commit failed: ${JSON.stringify(resp)}`));
          });
        }),
      ]);

      await Promise.all([confirmationPromise, commitCallbackPromise]);

      console.log(`✅ Both players confirmed for round ${round}`);

      if (round < ROUNDS) {
        // Wait for the auto-advanced round message, or trigger fallback
        try {
          const nextRound = await waitForEvent(sPlayer1, 'game:round_start', 15_000);
          console.log('Next round started event received:', nextRound.round);
        } catch (err) {
          console.warn('No auto round_start event received, falling back to next-round REST');
          await axios.post(
            `${API_URL}/session/${sessionId}/next-round`,
            {},
            { headers: { Authorization: `Bearer ${facilitator.token}` } },
          );
        }
      } else {
        // Last round should end the session
        await waitForEvent(sPlayer1, 'sessionEnded', 15_000);
      }

      await sleep(1_000);
    }

    // 5. End session
    console.log('\n🏁 Ending Session...');
    const endRes = await axios.post(
      `${API_URL}/session/${sessionId}/end`,
      {},
      { headers: { Authorization: `Bearer ${facilitator.token}` } },
    );

    // 6. Verify rankings
    const rankings = Array.isArray(endRes.data)
      ? endRes.data
      : endRes.data?.rankings ?? [];

    if (rankings.length === 0) {
      console.warn('⚠️ No rankings returned — check API response shape');
      console.log('Raw response:', JSON.stringify(endRes.data, null, 2));
    } else {
      console.log('📊 FINAL RANKINGS:');
      rankings.forEach((r: any) => {
        console.log(
          `  ${r.rank}. ${r.displayName}: $${r.totalValue?.toLocaleString()} (${r.returnPct}%) — Score: ${r.score}`,
        );
      });
    }

    console.log('\n✅ E2E Simulation Complete');
    process.exit(0);
  } catch (error: any) {
    const detail = error.response ? `${error.response.status} ${JSON.stringify(error.response.data)}` : error.message;
    console.error('❌ E2E Failed:', detail);
    process.exit(1);
  } finally {
    sockets.forEach(s => s.disconnect());
  }
}

runE2E();
