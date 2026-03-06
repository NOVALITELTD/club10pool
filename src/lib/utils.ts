export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatPercent(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return `${num.toFixed(2)}%`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function generateBatchCode(sequence: number): string {
  // A, B, C... Z, AA, AB...
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (sequence < 26) return `BATCH-${alpha[sequence]}`;
  const first = alpha[Math.floor(sequence / 26) - 1];
  const second = alpha[sequence % 26];
  return `BATCH-${first}${second}`;
}

export function calcSharePercents(members: { capitalAmount: number }[]): number[] {
  const total = members.reduce((sum, m) => sum + m.capitalAmount, 0);
  if (total === 0) return members.map(() => 0);
  return members.map((m) => (m.capitalAmount / total) * 100);
}
