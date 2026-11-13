export const card =
  'rounded-2xl border border-midnight/10 bg-white shadow-[0_24px_60px_-42px_rgba(16,63,53,0.28)] dark:border-white/10 dark:bg-charcoal'
export const label = 'text-[0.68rem] font-medium uppercase tracking-[0.18em] text-midnight/50 dark:text-ivory/50'
export const field =
  'w-full rounded-xl border border-midnight/10 bg-white px-3.5 py-2.5 text-sm text-midnight outline-none transition placeholder:text-midnight/35 focus:border-gold dark:border-white/10 dark:bg-ink dark:text-ivory dark:placeholder:text-ivory/30'
export const btnGold =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-ivory transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50'
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-midnight/10 bg-white px-4 py-2.5 text-sm font-medium text-midnight transition hover:border-gold dark:border-white/10 dark:bg-transparent dark:text-ivory'
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-expense px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
export const moneyIn = 'font-semibold tabular-nums text-income dark:text-income-bright'
export const moneyOut = 'font-semibold tabular-nums text-expense dark:text-expense-bright'

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}
