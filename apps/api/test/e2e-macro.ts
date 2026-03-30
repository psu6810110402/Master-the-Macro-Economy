import { PrismaClient } from '@hackanomics/database';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001';

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthClient(): Promise<AxiosInstance> {
  let token: string | undefined;

  // Try existing admin account first
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@hackanomics.dev',
      password: 'password123',
    });
    token = res.data?.access_token ?? res.data?.accessToken;
  } catch {
    // Admin doesn't exist — create a fresh facilitator account
    const res = await axios.post(`${API_URL}/auth/register`, {
      email: `testadmin_${Date.now()}@hackanomics.dev`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'FACILITATOR',
    });
    token = res.data?.access_token ?? res.data?.accessToken;
  }

  if (!token) throw new Error('Authentication failed: could not obtain JWT');

  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('🚀 Starting Macro Persistence Test...');
  let sessionId: string | undefined;

  try {
    const api = await getAuthClient();
    console.log('✅ Authenticated');

    // Create session
    const sessionRes = await api.post('/session/create', {
      name: 'Macro Test Session',
      maxPlayers: 10,
      scenarioId: 'TECH_CRISIS',
      format: 'STANDARD',
    });
    sessionId = sessionRes.data.id;
    console.log(`✅ Session Created: ${sessionRes.data.code}`);

    // Start session (round 1)
    await api.post(`/session/${sessionId}/start`);
    console.log('✅ Session Started (Round 1)');

    // Inject macro overrides
    const OVERRIDE_RATE = 15.5;
    await api.patch(`/game/macro/${sessionId}`, {
      interestRate: OVERRIDE_RATE,
      blackSwanActive: true,
      blackSwanEvent: 'Global Pandemic',
    });
    console.log('✅ Injected Macro Overrides & Black Swan for Round 1');

    // Advance to round 2
    await api.post(`/session/${sessionId}/next-round`);
    console.log('✅ Advanced to Round 2');

    // Verify persistence via DB
    const macro2 = await prisma.macroState.findUnique({
      where: { sessionId_roundNumber: { sessionId: sessionId!, roundNumber: 2 } },
    });
    console.log('📊 Round 2 Macro State:', macro2);

    let passed = true;

    if (macro2?.blackSwanActive && macro2?.blackSwanEvent === 'Global Pandemic') {
      console.log('✅ PASS: Black Swan persisted to Round 2');
    } else {
      console.error('❌ FAIL: Black Swan did not persist');
      passed = false;
    }

    if (macro2 && Math.abs(macro2.interestRate - OVERRIDE_RATE) < 2) {
      console.log(`✅ PASS: Interest Rate persisted (${macro2.interestRate})`);
    } else {
      console.error(`❌ FAIL: Interest rate reset. Expected ~${OVERRIDE_RATE}, Got ${macro2?.interestRate}`);
      passed = false;
    }

    process.exit(passed ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Test Failed:', error.response?.data ?? error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
