
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001';

async function runE2E() {
  console.log('🚀 Starting Full 5-Round E2E Simulation...');

  try {
    // 1. Setup Actors
    const facilitator = await createGuest('FACILITATOR', 'Fac', 'Boss');
    const player1 = await createGuest('PLAYER', 'Alpha', 'One');
    const player2 = await createGuest('PLAYER', 'Beta', 'Two');

    console.log('✅ Actors Ready');

    // 2. Create Session (Facilitator)
    const sessionRes = await axios.post(`${API_URL}/session/create`, 
      { name: 'E2E Stability Test', maxPlayers: 5 },
      { headers: { Authorization: `Bearer ${facilitator.token}` } }
    );
    const session = sessionRes.data;
    const sessionId = session.id;
    const sessionCode = session.code;
    console.log(`✅ Session Created: ${sessionCode} (${sessionId})`);

    // 3. Connect Sockets & Join
    const sPlayer1 = await connectSocket(player1.token, sessionId);
    const sPlayer2 = await connectSocket(player2.token, sessionId);
    
    await axios.post(`${API_URL}/session/join`, 
      { code: sessionCode },
      { headers: { Authorization: `Bearer ${player1.token}` } }
    );
    await axios.post(`${API_URL}/session/join`, 
      { code: sessionCode },
      { headers: { Authorization: `Bearer ${player2.token}` } }
    );
    console.log('✅ Players Joined');

    // 4. Game Loop (1 to 5)
    for (let round = 1; round <= 5; round++) {
      console.log(`\n--- ROUND ${round} ---`);
      
      // Start/Next Round
      if (round === 1) {
        await axios.post(`${API_URL}/session/${sessionId}/start`, {}, { headers: { Authorization: `Bearer ${facilitator.token}` } });
      } else {
        await axios.post(`${API_URL}/session/${sessionId}/next-round`, {}, { headers: { Authorization: `Bearer ${facilitator.token}` } });
      }
      console.log('🔔 Round Triggered');

      // Wait for price update
      await sleep(2000);

      // Commit Trades (100% Allocation)
      const commitData = {
        sessionId,
        allocation: {
          TECH: 20, INDUSTRIAL: 20, CONSUMER: 20, BOND: 20, GOLD: 20
        }
      };

      console.log('💸 Committing Trades...');
      sPlayer1.emit('trade:commit', commitData);
      sPlayer2.emit('trade:commit', commitData);

      // Wait for sync
      await sleep(2000);
    }

    // 5. End Session
    console.log('\n🏁 Ending Session...');
    const endRes = await axios.post(`${API_URL}/session/${sessionId}/end`, {}, { headers: { Authorization: `Bearer ${facilitator.token}` } });
    console.log('✅ Session Ended');

    // 6. Verify Scores
    const rankings = endRes.data;
    console.log('📊 DEBUG RESPONSE TYPE:', typeof rankings, Array.isArray(rankings));
    console.log('📊 DEBUG RESPONSE DATA:', JSON.stringify(rankings, null, 2));
    console.log('📊 FINAL RANKINGS:');
    if (Array.isArray(rankings)) {
      rankings.forEach((r: any) => {
        console.log(`${r.rank}. ${r.displayName}: $${r.totalValue.toLocaleString()} (${r.returnPct}%) - Score: ${r.score}`);
      });
    } else if (rankings && typeof rankings === 'object' && rankings.rankings) {
      console.log('Rankings found in .rankings property');
      rankings.rankings.forEach((r: any) => {
        console.log(`${r.rank}. ${r.displayName}: $${r.totalValue.toLocaleString()} (${r.returnPct}%) - Score: ${r.score}`);
      });
    } else {
      console.log('No rankings returned or invalid format');
    }

    process.exit(0);
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

async function createGuest(role: string, first: string, last: string) {
  const res = await axios.post(`${API_URL}/auth/guest`, { role, firstName: first, lastName: last });
  // Extract JWT from cookie header manually since using axios in node
  const cookie = res.headers['set-cookie']?.[0];
  const token = cookie?.split('jwt=')[1].split(';')[0];
  return { token };
}

async function connectSocket(token: string, sessionId: string): Promise<Socket> {
  const socket = io(WS_URL, {
    auth: { token },
    query: { sessionId }
  });

  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      reject(err);
    });
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runE2E();
