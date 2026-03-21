import { PrismaClient } from '@hackanomics/database';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@hackanomics.dev' },
    update: { role: 'ADMIN', passwordHash },
    create: { 
      email: 'admin@hackanomics.dev', 
      passwordHash, 
      displayName: 'System Admin', 
      role: 'ADMIN', 
      supabaseId: 'local_admin_123' 
    }
  });
  console.log('ADMIN_SEEDED_SUCCESSFULLY');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
