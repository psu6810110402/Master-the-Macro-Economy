import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const facilitatorId = 'fac-1';
  const sessionId = 'TEST-SESSION-ID';

  // 1. Create Facilitator
  await prisma.user.upsert({
    where: { id: facilitatorId },
    update: {},
    create: {
      id: facilitatorId,
      supabaseId: 'supabase-fac-1',
      email: 'fac@hackanomics.com',
      displayName: 'Facilitator One',
      role: 'FACILITATOR',
    },
  });

  // 2. Create Session
  await prisma.gameSession.upsert({
    where: { id: sessionId },
    update: { status: 'WAITING' },
    create: {
      id: sessionId,
      code: 'TEST69',
      name: 'Global Macro Alpha',
      facilitatorId,
      status: 'WAITING',
      roundNumber: 1,
    },
  });

  // 3. Create 3 Players
  const mockPlayers = [
    { id: 'u1', name: 'Soros Junior', cash: 125000 },
    { id: 'u2', name: 'Buffett Disciple', cash: 98000 },
    { id: 'u3', name: 'Degenerate Trader', cash: 45000 },
  ];

  for (const p of mockPlayers) {
    const user = await prisma.user.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        supabaseId: `supabase-${p.id}`,
        email: `${p.id}@test.com`,
        displayName: p.name,
      },
    });

    const sp = await prisma.sessionPlayer.upsert({
      where: { sessionId_userId: { sessionId, userId: user.id } },
      update: {},
      create: {
        sessionId,
        userId: user.id,
      },
    });

    await prisma.portfolio.upsert({
      where: { sessionPlayerId: sp.id },
      update: { cashBalance: p.cash },
      create: {
        userId: user.id,
        sessionPlayerId: sp.id,
        cashBalance: p.cash,
      },
    });
  }

  console.log('✅ Leaderboard Test Data Seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
