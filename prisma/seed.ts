// prisma/seed.ts
import { PrismaClient, BatchStatus, MemberStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Club10 Pool database...')

  // Create admin
  const adminHash = await bcrypt.hash('Admin@Club10!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@club10pool.com' },
    update: {},
    create: {
      fullName: 'Club10 Admin',
      email: 'admin@club10pool.com',
      passwordHash: adminHash,
      isAdmin: true,
      status: MemberStatus.ACTIVE,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // Create sample members
  const memberData = [
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

  const memberHash = await bcrypt.hash('Member@123!', 12)
  const members = []
  for (const m of memberData) {
    const member = await prisma.member.upsert({
      where: { email: m.email },
      update: {},
      create: { ...m, passwordHash: memberHash, status: MemberStatus.ACTIVE },
    })
    members.push(member)
  }
  console.log(`✅ ${members.length} members created`)

  // Create Batch A (ACTIVE - currently trading)
  const batchA = await prisma.batch.upsert({
    where: { name: 'Batch A' },
    update: {},
    create: {
      name: 'Batch A',
      description: 'Inaugural batch — 10 members, $10 each',
      status: BatchStatus.ACTIVE,
      targetMembers: 10,
      capitalPerMember: 10.00,
      totalCapital: 100.00,
      tradingAccountId: 'MT5-001-CLUB10A',
      tradingPlatform: 'MT5',
      managementFeePercent: 5.00,
      openingDate: new Date('2024-01-01'),
      activationDate: new Date('2024-01-05'),
      closingDate: new Date('2024-01-31'),
    },
  })

  // Add all 10 members to Batch A
  for (const member of members) {
    await prisma.batchMember.upsert({
      where: { batchId_memberId: { batchId: batchA.id, memberId: member.id } },
      update: {},
      create: {
        batchId: batchA.id,
        memberId: member.id,
        capitalContributed: 10.00,
        capitalShare: 0.100000,
      },
    })
    // Record deposit transaction
    await prisma.transaction.create({
      data: {
        memberId: member.id,
        type: 'DEPOSIT',
        amount: 10.00,
        description: `Capital deposit for Batch A`,
        reference: `DEP-BATCHA-${member.id.slice(-6)}`,
      },
    })
  }
  console.log('✅ Batch A created with 10 members')

  // Create Batch B (FORMING)
  const batchB = await prisma.batch.upsert({
    where: { name: 'Batch B' },
    update: {},
    create: {
      name: 'Batch B',
      description: 'Second batch — forming now',
      status: BatchStatus.FORMING,
      targetMembers: 10,
      capitalPerMember: 20.00,
      totalCapital: 200.00,
      managementFeePercent: 5.00,
      openingDate: new Date('2024-02-01'),
    },
  })

  // Add 5 members to Batch B (still forming)
  for (let i = 0; i < 5; i++) {
    await prisma.batchMember.upsert({
      where: { batchId_memberId: { batchId: batchB.id, memberId: members[i].id } },
      update: {},
      create: {
        batchId: batchB.id,
        memberId: members[i].id,
        capitalContributed: 20.00,
        capitalShare: 0.200000, // will be recalculated when full
      },
    })
  }
  console.log('✅ Batch B created (forming, 5/10 members)')

  // Add monthly result for Batch A
  const batchAMembers = await prisma.batchMember.findMany({ where: { batchId: batchA.id } })
  const monthlyResult = await prisma.monthlyResult.create({
    data: {
      batchId: batchA.id,
      periodStart: new Date('2024-01-05'),
      periodEnd: new Date('2024-01-31'),
      openingBalance: 100.00,
      closingBalance: 150.00,
      grossProfit: 50.00,
      managementFee: 2.50,    // 5% of gross
      netProfit: 47.50,
      profitPercent: 47.50,
      notes: 'Strong month — trend-following strategy performed well.',
    },
  })

  // Create pending payouts for each member (profit share = netProfit * capitalShare)
  for (const bm of batchAMembers) {
    const profitShare = 47.50 * 0.1 // 10% share each = $4.75
    await prisma.payout.create({
      data: {
        batchId: batchA.id,
        batchMemberId: bm.id,
        monthlyResultId: monthlyResult.id,
        principalAmount: 0.00,       // not withdrawing
        profitAmount: profitShare,
        totalAmount: profitShare,
        status: 'PENDING',
      },
    })
  }
  console.log('✅ Monthly result & payouts seeded for Batch A')

  // Audit log entry
  await prisma.auditLog.create({
    data: {
      actorEmail: 'system@club10pool.com',
      action: 'DATABASE_SEEDED',
      entityType: 'System',
      metadata: { batches: 2, members: 10 },
    },
  })

  console.log('\n🎉 Seeding complete!')
  console.log('───────────────────────────────')
  console.log('Admin login: admin@club10pool.com / Admin@Club10!')
  console.log('Member login: alice@example.com / Member@123!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
