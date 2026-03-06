import { PrismaClient, BatchStatus, MemberStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Club10 Pool database...')

  // Create admin User
  const adminHash = await bcrypt.hash('Admin@Club10!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@club10pool.com' },
    update: {},
    create: {
      name: 'Club10 Admin',
      email: 'admin@club10pool.com',
      passwordHash: adminHash,
      role: 'admin',
    },
  })
  console.log('✅ Admin created:', admin.email)

  // Create sample investors
  const investorData = [
    { fullName: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567890' },
    { fullName: 'Bob Smith', email: 'bob@example.com', phone: '+1234567891' },
    { fullName: 'Carol White', email: 'carol@example.com', phone: '+1234567892' },
    { fullName: 'David Brown', email: 'david@example.com', phone: '+1234567893' },
    { fullName: 'Eva Martinez', email: 'eva@example.com', phone: '+1234567894' },
    { fullName: 'Frank Lee', email: 'frank@example.com', phone: '+1234567895' },
    { fullName: 'Grace Kim', email: 'grace@example.com', phone: '+1234567896' },
    { fullName: 'Henry Davis', email: 'henry@example.com', phone: '+1234567897' },
    { fullName: 'Iris Wilson', email: 'iris@example.com', phone: '+1234567898' },
    { fullName: 'James Taylor', email: 'james@example.com', phone: '+1234567899' },
  ]

  const investors = []
  for (const m of investorData) {
    const investor = await prisma.investor.upsert({
      where: { email: m.email },
      update: {},
      create: { ...m },
    })
    investors.push(investor)
  }
  console.log(`✅ ${investors.length} investors created`)

  // Create Batch A (ACTIVE)
  const batchA = await prisma.batch.upsert({
    where: { batchCode: 'BATCH-A' },
    update: {},
    create: {
      batchCode: 'BATCH-A',
      name: 'Batch A',
      description: 'Inaugural batch — 10 members, $10 each',
      status: BatchStatus.ACTIVE,
      targetMembers: 10,
      contributionPerMember: 10.00,
      targetCapital: 100.00,
      tradingAccountId: 'MT5-001-CLUB10A',
      brokerName: 'MT5',
      startDate: new Date('2024-01-05'),
      endDate: new Date('2024-01-31'),
    },
  })

  // Add all 10 investors to Batch A
  const batchAMembers = []
  for (const investor of investors) {
    const bm = await prisma.batchMember.upsert({
      where: { batchId_investorId: { batchId: batchA.id, investorId: investor.id } },
      update: {},
      create: {
        batchId: batchA.id,
        investorId: investor.id,
        capitalAmount: 10.00,
        sharePercent: 10.00,
      },
    })
    batchAMembers.push(bm)

    await prisma.transaction.create({
      data: {
        investorId: investor.id,
        batchMemberId: bm.id,
        type: 'DEPOSIT',
        status: 'CONFIRMED',
        amount: 10.00,
        reference: `DEP-BATCHA-${investor.id.slice(-6)}`,
        notes: 'Capital deposit for Batch A',
      },
    })
  }
  console.log('✅ Batch A created with 10 investors')

  // Create Batch B (FORMING)
  const batchB = await prisma.batch.upsert({
    where: { batchCode: 'BATCH-B' },
    update: {},
    create: {
      batchCode: 'BATCH-B',
      name: 'Batch B',
      description: 'Second batch — forming now',
      status: BatchStatus.FORMING,
      targetMembers: 10,
      contributionPerMember: 20.00,
      targetCapital: 200.00,
      startDate: new Date('2024-02-01'),
    },
  })

  for (let i = 0; i < 5; i++) {
    await prisma.batchMember.upsert({
      where: { batchId_investorId: { batchId: batchB.id, investorId: investors[i].id } },
      update: {},
      create: {
        batchId: batchB.id,
        investorId: investors[i].id,
        capitalAmount: 20.00,
        sharePercent: 20.00,
      },
    })
  }
  console.log('✅ Batch B created (forming, 5/10 investors)')

  // Monthly report for Batch A
  const report = await prisma.monthlyReport.upsert({
    where: { batchId_reportMonth: { batchId: batchA.id, reportMonth: new Date('2024-01-01') } },
    update: {},
    create: {
      batchId: batchA.id,
      reportMonth: new Date('2024-01-01'),
      openingBalance: 100.00,
      closingBalance: 150.00,
      grossProfit: 50.00,
      platformFeeRate: 0.05,
      platformFee: 2.50,
      netProfit: 47.50,
      notes: 'Strong month — trend-following strategy performed well.',
    },
  })

  // Profit distribution
  const distribution = await prisma.profitDistribution.create({
    data: {
      batchId: batchA.id,
      reportId: report.id,
      totalProfit: 47.50,
    },
  })

  for (const bm of batchAMembers) {
    await prisma.profitShare.create({
      data: {
        distributionId: distribution.id,
        batchMemberId: bm.id,
        capitalAmount: 10.00,
        sharePercent: 10.00,
        profitAmount: 4.75,
      },
    })
  }
  console.log('✅ Monthly report & profit distribution seeded for Batch A')

  console.log('\n🎉 Seeding complete!')
  console.log('───────────────────────────────')
  console.log('Admin login: admin@club10pool.com / Admin@Club10!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
