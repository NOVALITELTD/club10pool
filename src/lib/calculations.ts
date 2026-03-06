// src/lib/calculations.ts
// Core business logic for Club10 Pool profit distribution

import { Decimal } from '@prisma/client/runtime/library'

export interface MemberCapital {
  batchMemberId: string
  investorId: string           // was: memberId
  capitalAmount: number        // was: capitalContributed
}

export interface ProfitDistribution {
  batchMemberId: string
  investorId: string           // was: memberId
  capitalAmount: number        // was: capitalContributed
  sharePercent: number         // was: capitalShare
  profitShare: number
  totalPayout: number
}

export interface MonthlyResultInput {
  openingBalance: number
  closingBalance: number
  platformFeeRate: number      // was: managementFeePercent (e.g. 0.10 = 10%)
  members: MemberCapital[]
  withdrawingInvestorIds?: string[]  // was: withdrawingMemberIds
}

export interface MonthlyResultOutput {
  openingBalance: number
  closingBalance: number
  grossProfit: number
  managementFee: number
  netProfit: number
  profitPercent: number
  distributions: ProfitDistribution[]
}

/**
 * Calculates profit distribution for a batch month-end settlement.
 * 
 * Formula:
 *   gross_profit = closing_balance - opening_balance
 *   management_fee = gross_profit * (management_fee_percent / 100)
 *   net_profit = gross_profit - management_fee
 *   member_share = member_capital / total_capital
 *   member_profit = net_profit * member_share
 */
export function calculateMonthlyDistribution(input: MonthlyResultInput): MonthlyResultOutput {
  const { openingBalance, closingBalance, managementFeePercent, members, withdrawingMemberIds = [] } = input

  const grossProfit = closingBalance - openingBalance
  const managementFee = grossProfit > 0 ? (grossProfit * managementFeePercent) / 100 : 0
  const netProfit = grossProfit - managementFee
  const profitPercent = openingBalance > 0 ? (netProfit / openingBalance) * 100 : 0

  const totalCapital = members.reduce((sum, m) => sum + m.capitalContributed, 0)

  const distributions: ProfitDistribution[] = members.map((m) => {
    const capitalShare = totalCapital > 0 ? m.capitalContributed / totalCapital : 0
    const profitShare = netProfit * capitalShare
    const isWithdrawing = withdrawingMemberIds.includes(m.memberId)
    const totalPayout = isWithdrawing ? m.capitalContributed + profitShare : profitShare

    return {
      batchMemberId: m.batchMemberId,
      memberId: m.memberId,
      capitalContributed: m.capitalContributed,
      capitalShare: parseFloat(capitalShare.toFixed(6)),
      profitShare: parseFloat(profitShare.toFixed(2)),
      totalPayout: parseFloat(totalPayout.toFixed(2)),
    }
  })

  return {
    openingBalance: parseFloat(openingBalance.toFixed(2)),
    closingBalance: parseFloat(closingBalance.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    managementFee: parseFloat(managementFee.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    profitPercent: parseFloat(profitPercent.toFixed(4)),
    distributions,
  }
}

/**
 * Calculate capital shares for all members in a batch.
 * Called when a batch is fully formed or a member joins.
 */
export function calculateCapitalShares(members: MemberCapital[]): { memberId: string; capitalShare: number }[] {
  const totalCapital = members.reduce((sum, m) => sum + m.capitalContributed, 0)
  return members.map((m) => ({
    memberId: m.memberId,
    capitalShare: totalCapital > 0 ? parseFloat((m.capitalContributed / totalCapital).toFixed(6)) : 0,
  }))
}

export function toNumber(d: Decimal | number): number {
  return typeof d === 'number' ? d : parseFloat(d.toString())
}
