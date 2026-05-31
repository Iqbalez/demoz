import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration: User.role/tenantId -> TenantMember');

  const users = await prisma.user.findMany({
    where: {
      tenantId: {
        not: null,
      },
    },
  });

  console.log(`Found ${users.length} users to migrate.`);

  let migrated = 0;
  for (const user of users) {
    if (!user.tenantId || !user.role) continue;

    // Map legacy 'OWNER' to 'ORG_ADMIN', else keep role
    const newRole = user.role === 'OWNER' ? 'ORG_ADMIN' : user.role;

    // Create the pivot table record
    await prisma.tenantMember.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: user.tenantId,
        },
      },
      update: {}, // if it exists, do nothing
      create: {
        userId: user.id,
        tenantId: user.tenantId,
        role: newRole as any,
      },
    });

    migrated++;
  }

  console.log(`Successfully migrated ${migrated} users to TenantMember pivot table.`);
}

main()
  .catch((e) => {
    console.error('Migration failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
