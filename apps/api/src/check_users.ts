import { prisma } from './prisma';

async function run() {
  const users = await prisma.user.findMany({
    where: { role: 'FACILITATOR' },
    select: { email: true, role: true }
  });
  console.log('FACILITATORS_IN_DB:', JSON.stringify(users));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
