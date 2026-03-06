// src/lib/calculations.ts
import { Decimal } from '@prisma/client/runtime/library'

export interface MemberCapital {
  batchMemberId: string
  investorId: string
  capitalAmount: number
}

export interface ProfitDistribution {
  batchMemberId: string
  investorId: string
  capitalAmount: number
  sharePercent: number
  profitShare: number
  totalPayout: number
}

export interface MonthlyResultInput {
  openingBalance: number
  closingBalance: number
  platformFeeRate: number       // e.g. 0.10 = 10%
  members: MemberCapital[]
  withdrawingInvestorIds?: string[]
}

export interface MonthlyResultOutput {
  openingBalance: number
  closingBalance: number
  grossProfit: number
  platformFee: number
  netProfit: number
  profitPercent: number
  distributions: ProfitDistribution[]
}

export function calculateMonthlyDistribution(input: MonthlyResultInput): MonthlyResultOutput {
  const { openingBalance, closingBalance, platformFeeRate, members, withdrawingInvestorIds = [] } = input

  const grossProfit = closingBalance - openingBalance
  const platformFee = grossProfit > 0 ? grossProfit * platformFeeRate : 0
  const netProfit = grossProfit - platformFee
  const profitPercent = openingBalance > 0 ? (netProfit / openingBalance) * 100 : 0
  const totalCapital = members.reduce((sum, m) => sum + m.capitalAmount, 0)

  const distributions: ProfitDistribution[] = members.map((m) => {
    const sharePercent = totalCapital > 0 ? m.capitalAmount / totalCapital : 0
    const profitShare = netProfit * sharePercent
    const isWithdrawing = withdrawingInvestorIds.includes(m.investorId)
    const totalPayout = isWithdrawing ? m.capitalAmount + profitShare : profitShare

    return {
      batchMemberId: m.batchMemberId,
      investorId: m.investorId,
      capitalAmount: m.capitalAmount,
      sharePercent: parseFloat(sharePercent.toFixed(6)),
      profitShare: parseFloat(profitShare.toFixed(2)),
      totalPayout: parseFloat(totalPayout.toFixed(2)),
    }
  })

  return {
    openingBalance: parseFloat(openingBalance.toFixed(2)),
    closingBalance: parseFloat(closingBalance.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    platformFee: parseFloat(platformFee.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    profitPercent: parseFloat(profitPercent.toFixed(4)),
    distributions,
  }
}

export function calculateCapitalShares(members: MemberCapital[]): { investorId: string; sharePercent: number }[] {
  const totalCapital = members.reduce((sum, m) => sum + m.capitalAmount, 0)
  return members.map((m) => ({
    investorId: m.investorId,
    sharePercent: totalCapital > 0 ? parseFloat((m.capitalAmount / totalCapital).toFixed(6)) : 0,
  }))
}

export function toNumber(d: Decimal | number): number {
  return typeof d === 'number' ? d : parseFloat(d.toString())
}
