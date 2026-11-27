/**
 * Removes every fictional account (isDemo) and what hangs off it, so a
 * database can serve production. Real accounts are untouched. Shows what it
 * would delete and asks for --yes before doing it.
 *
 *   npm run db:purge-demo            # dry run: counts only
 *   npm run db:purge-demo -- --yes   # delete
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const ids = (await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } })).map((u) => u.id);
  const convs = await prisma.conversation.count({ where: { members: { some: { userId: { in: ids } } } } });
  console.log(`Demo accounts: ${ids.length}. Conversations involving them: ${convs}.`);
  if (!process.argv.includes('--yes')) { console.log('Dry run. Re-run with --yes to delete.'); return; }
  await prisma.$transaction([
    // Conversations with a demo member go entirely (a real member keeps nothing fictional).
    prisma.conversation.deleteMany({ where: { members: { some: { userId: { in: ids } } } } }),
    prisma.introduction.deleteMany({ where: { OR: [{ personAId: { in: ids } }, { personBId: { in: ids } }, { introducerId: { in: ids } }] } }),
    prisma.report.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { reportedId: { in: ids } }] } }),
    prisma.callLog.deleteMany({ where: { OR: [{ callerId: { in: ids } }, { calleeId: { in: ids } }] } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`Deleted ${ids.length} demo accounts.`);
}

main().finally(() => prisma.$disconnect());
