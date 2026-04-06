import { prisma } from './prisma';

async function run() {
  const sessionId = 'c7162adf-6974-4579-b406-5cfd2945c099';
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { rounds: true, macroStates: true }
  });
  console.log('SESSION_DATA:', JSON.stringify(session, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
