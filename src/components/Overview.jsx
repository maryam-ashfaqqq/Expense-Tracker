import { useFinance } from '../context/FinanceContext.jsx'
import { firstName, formatChange, greeting, pkr } from '../lib/format.js'
import { btnDanger, btnGold, card, cn, label, moneyIn, moneyOut } from '../lib/ui.js'
import { Avatar } from './Icons.jsx'
import { Charts } from './Charts.jsx'
import { TransactionList } from './Transactions.jsx'

const BAR = {
  gold: 'bg-gold',
  income: 'bg-income',
  expense: 'bg-expense',
  warn: 'bg-warn',
}

function toneOf(change, goodWhenUp) {
  if (!change) return 'flat'
  const up = change > 0
  const good = goodWhenUp ? up : !up
  return good ? 'good' : 'bad'
}

export function Overview() {
  const { user, dashboard: dash, theme, navigate } = useFinance()
  if (!dash) return null
  const showSample = Boolean(dash.sample)

  return (
    <div className="rise space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div>
            <p className="text-sm text-gold-deep dark:text-gold">
              {greeting()}, {firstName(user.name)}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h2>
            <p className="mt-1 text-sm text-midnight/55 dark:text-ivory/55">Here is your {dash.monthLabel} position.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGold} onClick={() => navigate('income')}>
            Add income
          </button>
          <button type="button" className={btnDanger} onClick={() => navigate('expense')}>
            Add expense
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dash.cards.map((item) => {
          const tone = toneOf(item.change, item.goodWhenUp)
          const amountClass =
            item.key === 'income'
              ? moneyIn
              : item.key === 'spent'
                ? moneyOut
                : item.key === 'remaining'
                  ? item.amount < 0
                    ? moneyOut
                    : moneyIn
                  : 'text-midnight dark:text-ivory'
          return (
            <article key={item.key} className={`${card} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <p className={label}>{item.label}</p>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    tone === 'good' && 'bg-income/10 text-income dark:text-income-bright',
                    tone === 'bad' && 'bg-expense/10 text-expense dark:text-expense-bright',
                    tone === 'flat' && 'bg-midnight/5 text-midnight/50 dark:bg-white/10 dark:text-ivory/50',
                  )}
                >
                  {formatChange(item.change)}
                </span>
              </div>
              <p className={cn('mt-4 text-3xl tracking-tight', amountClass)}>{pkr(item.amount)}</p>
              <p className="mt-1 text-xs text-midnight/50 dark:text-ivory/50">{item.detail}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-midnight/8 dark:bg-white/10">
                <div className={cn('h-full rounded-full', BAR[item.tone] || 'bg-gold')} style={{ width: `${item.bar}%` }} />
              </div>
              <p className="mt-2 text-[0.72rem] text-midnight/50 dark:text-ivory/45">{item.barLabel}</p>
            </article>
          )
        })}
      </section>

      {dash.alerts.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Budget alerts">
          {dash.alerts.map((alert) => {
            const over = alert.level === 'over'
            const pct = alert.budget > 0 ? Math.round(alert.ratio * 100) : 100
            return (
              <div
                key={alert.category}
                role={over ? 'alert' : 'status'}
                className={cn(
                  'rounded-2xl border px-4 py-3',
                  over
                    ? 'budget-alert border-expense/40 bg-expense/10 text-[#6e2c2c] dark:bg-expense/15 dark:text-expense-bright'
                    : 'border-warn/50 bg-warn/15 text-[#6b4e12] dark:bg-warn/15 dark:text-[#f6d48a]',
                )}
              >
                <p className="font-semibold">{over ? `${alert.category} budget exceeded` : `${alert.category} is nearing its limit`}</p>
                <p className="mt-1 text-sm">
                  {pkr(alert.spent)} of {pkr(alert.budget)} · {pct}% used
                  {over ? '. This category is at or past its monthly cap.' : '. You have crossed 80% of this budget.'}
                </p>
              </div>
            )
          })}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Smart insights">
        {dash.insights.map((insight, index) => (
          <article
            key={insight.id}
            className={cn(
              card,
              'border-l-4 p-5',
              insight.tone === 'good' && 'border-l-income',
              insight.tone === 'warn' && 'border-l-warn',
              insight.tone === 'bad' && 'border-l-expense',
              insight.tone === 'neutral' && 'border-l-gold',
            )}
          >
            <p className={label}>
              0{index + 1} · {insight.kicker}
            </p>
            <p className="mt-3 text-sm leading-relaxed">{insight.text}</p>
          </article>
        ))}
      </section>

      <Charts pie={dash.pie} bars={dash.bars} daily={dash.daily} monthLabel={dash.monthLabel} theme={theme} />

      <section className={card}>
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <div>
            <p className={label}>Ledger</p>
            <h3 className="mt-1 text-lg font-semibold">Recent activity</h3>
          </div>
          <button type="button" className="text-sm font-medium text-gold-deep hover:text-gold dark:text-gold" onClick={() => navigate('transactions')}>
            View all
          </button>
        </div>
        <TransactionList items={dash.recent} />
      </section>

      <p className="text-xs text-midnight/45 dark:text-ivory/40">
        Figures in Pakistani rupees · Private to your account
        {showSample ? ' · Sample activity from June to November 2026 is included.' : ''}
      </p>
    </div>
  )
}
