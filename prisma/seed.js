const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Club10 Pool database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin@Club10!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@club10pool.com' },
    update: {},
    create: {
      email: 'admin@club10pool.com',
      name: 'Club10 Admin',
      passwordHash,
      role: 'admin',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create sample investors
  const investors = await Promise.all([
    prisma.investor.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: { fullName: 'Alice Johnson', email: 'alice@example.com', phone: '+1-555-0101' },
    }),
    prisma.investor.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: { fullName: 'Bob Williams', email: 'bob@example.com', phone: '+1-555-0102' },
    }),
    prisma.investor.upsert({
      where: { email: 'carol@example.com' },
      update: {},
      create: { fullName: 'Carol Davis', email: 'carol@example.com', phone: '+1-555-0103' },
    }),
    prisma.investor.upsert({
      where: { email: 'david@example.com' },
      update: {},
      create: { fullName: 'David Martinez', email: 'david@example.com', phone: '+1-555-0104' },
    }),
    prisma.investor.upsert({
      where: { email: 'emma@example.com' },
      update: {},
      create: { fullName: 'Emma Wilson', email: 'emma@example.com', phone: '+1-555-0105' },
    }),
  ]);
  console.log(`✅ ${investors.length} sample investors created`);

  // Create Batch A
  const batchA = await prisma.batch.upsert({
    where: { batchCode: 'BATCH-A' },
    update: {},
    create: {
      batchCode: 'BATCH-A',
      name: 'Batch Alpha',
      description: 'Inaugural Club10 Pool batch — 10 members × $100',
      status: 'ACTIVE',
      targetMembers: 10,
      contributionPerMember: 100,
      targetCapital: 1000,
      brokerName: 'Demo Broker',
      tradingAccountId: 'ACC-001',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    },
  });
  console.log('✅ Batch A created');

  // Enroll investors into Batch A
  for (const investor of investors) {
    const member = await prisma.batchMember.upsert({
      where: { batchId_investorId: { batchId: batchA.id, investorId: investor.id } },
      update: {},
      create: {
        batchId: batchA.id,
        investorId: investor.id,
        capitalAmount: 100,
        sharePercent: 20, // 5 members = 20% each (demo)
        status: 'ACTIVE',
      },
    });

    // Record deposit transaction
    await prisma.transaction.create({
      data: {
        investorId: investor.id,
        batchMemberId: member.id,
        type: 'DEPOSIT',
        status: 'CONFIRMED',
        amount: 100,
        reference: `DEP-${batchA.batchCode}-${investor.id.slice(-4)}`,
        processedAt: new Date('2024-01-01'),
      },
    });
  }
  console.log('✅ Batch A members enrolled with deposit transactions');

  // Create a monthly report for January
  const report = await prisma.monthlyReport.create({
    data: {
      batchId: batchA.id,
      reportMonth: new Date('2024-01-01'),
      openingBalance: 500,
      closingBalance: 575,
      grossProfit: 75,
      platformFeeRate: 0.1,
      platformFee: 7.5,
      netProfit: 67.5,
      notes: 'Strong January performance.',
    },
  });
  console.log('✅ Monthly report created');

  // Create profit distribution
  const distribution = await prisma.profitDistribution.create({
    data: {
      batchId: batchA.id,
      reportId: report.id,
      totalProfit: 67.5,
      notes: 'January distribution — 5 members, 20% each',
    },
  });

  // Create profit shares for each member
  const members = await prisma.batchMember.findMany({ where: { batchId: batchA.id } });
  for (const member of members) {
    await prisma.profitShare.create({
      data: {
        distributionId: distribution.id,
        batchMemberId: member.id,
        capitalAmount: 100,
        sharePercent: 20,
        profitAmount: 13.5, // 20% of $67.50
      },
    });

    await prisma.transaction.create({
      data: {
        investorId: member.investorId,
        batchMemberId: member.id,
        type: 'PROFIT_SHARE',
        status: 'CONFIRMED',
        amount: 13.5,
        reference: `DIST-JAN24-${member.id.slice(-4)}`,
        processedAt: new Date('2024-02-01'),
      },
    });
  }
  console.log('✅ Profit distribution and shares recorded');

  console.log('\n🎉 Seed complete! Login: admin@club10pool.com / Admin@Club10!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
