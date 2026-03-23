import { PrismaClient } from '@hackanomics/database';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001';

async function run() {
  console.log('🚀 Starting Macro Persistence Test...');

  try {
    // 1. Authenticate Facilitator
    let loginData;
    try {
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@hackanomics.dev',
        password: 'password123',
      });
      loginData = loginRes.data;
    } catch (e) {
      console.log('Admin not registered, attempting registration...');
      // Admin should exist from seed
    }

    if (!loginData) {
       const regRes = await axios.post(`${API_URL}/auth/register`, {
        email: `testadmin_${Date.now()}@hackanomics.dev`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'FACILITATOR'
      });
      loginData = regRes.data;
    }

    const token = loginData?.access_token || loginData?.accessToken;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    console.log('✅ Authenticated');

    // 2. Create Session
    const sessionRes = await axios.post(`${API_URL}/session/create`, {
      name: 'Macro Test Session',
      maxPlayers: 10,
      scenarioId: 'TECH_CRISIS',
      format: 'STANDARD'
    });
    const session = sessionRes.data;
    const sessionId = session.id;
    console.log(`✅ Session Created: ${session.code}`);

    // Start Session
    await axios.post(`${API_URL}/session/${sessionId}/start`);
    console.log('✅ Session Started (Round 1)');

    // 3. Override Macro State for Round 1
    const OVERRIDE_RATE = 15.5; // crazy high rate
    await axios.patch(`${API_URL}/game/macro/${sessionId}`, {
      interestRate: OVERRIDE_RATE,
      blackSwanActive: true,
      blackSwanEvent: 'Global Pandemic' // Tier 3
    });
    console.log('✅ Injected Macro Overrides & Black Swan for Round 1');

    // 4. Advance to Next Round (Round 2)
    const nextRoundRes = await axios.post(`${API_URL}/session/${sessionId}/next-round`);
    console.log('✅ Advanced to Round 2');
    
    // 5. Verify Persistence
    const macro2 = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId, roundNumber: 2 } }
    });

    console.log('📊 Round 2 Macro State:', macro2);

    if (macro2?.blackSwanActive && macro2?.blackSwanEvent === 'Global Pandemic') {
      console.log('✅ SUCCESS: Black Swan persisted to Round 2!');
    } else {
      console.error('❌ FAILURE: Black Swan did not persist');
    }

    // Delta for round 1->2 in TECH_CRISIS usually has minimal r change, so it should be near OVERRIDE_RATE
    if (macro2 && Math.abs(macro2.interestRate - OVERRIDE_RATE) < 2) {
      console.log(`✅ SUCCESS: Interest Rate persisted! (${macro2.interestRate})`);
    } else {
      console.error(`❌ FAILURE: Interest rate reset. Expected ~${OVERRIDE_RATE}, Got ${macro2?.interestRate}`);
    }

  } catch (error: any) {
    console.error('Test Failed:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
