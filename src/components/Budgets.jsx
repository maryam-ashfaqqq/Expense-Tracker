import { useEffect, useState } from 'react'
import { CATEGORY_COLORS, EXPENSE_CATEGORIES } from '../data/categories.js'
import { useFinance } from '../context/FinanceContext.jsx'
import { statusFromSpent } from '../lib/analytics.js'
import { pkr } from '../lib/format.js'
import { btnGold, card, cn, field, label } from '../lib/ui.js'

export function BudgetsPage() {
  const { budgets, spent, saveBudgets } = useFinance()
  const [draft, setDraft] = useState(budgets)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(budgets)
  }, [budgets])

  const preview = statusFromSpent(
    spent,
    EXPENSE_CATEGORIES.reduce((all, category) => {
      all[category] = Number(draft[category]) || 0
      return all
    }, {}),
  )

  async function submit(event) {
    event.preventDefault()
    const next = {}
    for (const category of EXPENSE_CATEGORIES) {
      const amount = Number(draft[category])
      if (!Number.isFinite(amount) || amount < 0) {
        setError(`Enter a zero or positive budget for ${category}.`)
        return
      }
      next[category] = Math.round(amount)
    }
    setError('')
    try {
      await saveBudgets(next)
    } catch (err) {
      setError(err.message || 'Could not save budgets.')
    }
  }

  return (
    <form onSubmit={submit} className="rise space-y-4">
      <section className={`${card} p-5 sm:p-6`}>
        <p className={label}>Monthly limits</p>
        <h2 className="mt-2 text-2xl font-semibold">Category budgets</h2>
        <p className="mt-2 max-w-2xl text-sm text-midnight/60 dark:text-ivory/60">
          Limits apply to the current month. At 80% the row turns gold-amber. At 100% it turns red and pulses until you raise the limit or spending drops.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-income/10 px-2.5 py-1 text-income dark:text-income-bright">Under 80% on track</span>
          <span className="rounded-full bg-warn/15 px-2.5 py-1 text-[#7a5a16] dark:text-[#f6d48a]">80% warning</span>
          <span className="rounded-full bg-expense/10 px-2.5 py-1 text-expense dark:text-expense-bright">100% alert</span>
        </div>
      </section>

      <section className={`${card} divide-y divide-midnight/8 dark:divide-white/10`}>
        {preview.map((item) => {
          const width = item.budget > 0 ? Math.min(item.ratio * 100, 100) : item.spent > 0 ? 100 : 0
          const pct = item.budget > 0 ? Math.round(item.ratio * 100) : item.spent > 0 ? null : 0
          return (
            <div
              key={item.category}
              className={cn('grid gap-4 p-4 sm:grid-cols-[1.3fr_0.7fr] sm:items-center sm:p-5', item.level === 'over' && 'budget-alert')}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[item.category] }} />
                  <p className="font-medium">{item.category}</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em]',
                      item.level === 'over' && 'bg-expense/15 text-expense',
                      item.level === 'warn' && 'bg-warn/15 text-[#7a5a16] dark:text-[#f6d48a]',
                      item.level === 'ok' && 'bg-income/10 text-income dark:text-income-bright',
                    )}
                  >
                    {item.level === 'over' ? 'Over budget' : item.level === 'warn' ? 'Nearing limit' : 'On track'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-midnight/55 dark:text-ivory/55">
                  Spent {pkr(item.spent)}
                  {pct === null ? '' : ` · ${pct}% used`}
                </p>
                <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-midnight/8 dark:bg-white/10">
                  <span className="absolute inset-y-0 left-[80%] w-px bg-midnight/25 dark:bg-white/30" />
                  <div
                    className={cn(
                      'h-full rounded-full',
                      item.level === 'over' ? 'bg-expense' : item.level === 'warn' ? 'bg-warn' : 'bg-income',
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <label>
                <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-midnight/45 dark:text-ivory/45">Monthly budget</span>
                <span className="relative block">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-midnight/40">Rs</span>
                  <input
                    className={`${field} pl-10`}
                    type="number"
                    min="0"
                    step="100"
                    value={draft[item.category] ?? 0}
                    aria-label={`${item.category} monthly budget`}
                    onChange={(event) => setDraft((prev) => ({ ...prev, [item.category]: event.target.value }))}
                  />
                </span>
              </label>
            </div>
          )
        })}
      </section>

      {error ? <p className="text-sm text-expense">{error}</p> : null}
      <button className={btnGold} type="submit">
        Save budgets
      </button>
    </form>
  )
}
