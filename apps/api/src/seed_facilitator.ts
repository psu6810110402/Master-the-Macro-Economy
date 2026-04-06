import { prisma } from './prisma';
import * as bcrypt from 'bcrypt';

async function run() {
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'facilitator@hackanomics.dev' },
    update: { role: 'FACILITATOR', passwordHash },
    create: { 
      email: 'facilitator@hackanomics.dev', 
      passwordHash, 
      firstName: 'Game', 
      lastName: 'Facilitator',
      displayName: 'Game Facilitator', 
      role: 'FACILITATOR', 
      supabaseId: 'local_fac_123' 
    }
  });
  console.log('FACILITATOR_SEEDED_SUCCESSFULLY');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
