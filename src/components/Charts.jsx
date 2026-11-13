import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EXPENSE_CHART, INCOME_CHART } from '../data/categories.js'
import { compactRupees, pkr } from '../lib/format.js'
import { card, label } from '../lib/ui.js'

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload || {}
  const title = row.full || row.label || row.name || payload[0].name
  return (
    <div className="rounded-xl border border-midnight/10 bg-white px-3 py-2 text-sm shadow-xl dark:border-white/10 dark:bg-charcoal">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-midnight/50 dark:text-ivory/50">{title}</p>
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="mt-1 font-medium" style={{ color: item.color || item.payload?.color }}>
          {item.name}: {pkr(item.value)}
        </p>
      ))}
    </div>
  )
}

function Frame({ kicker, title, children, extra }) {
  return (
    <section className={`${card} flex h-full w-full flex-col p-4 sm:p-5`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className={label}>{kicker}</p>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        </div>
        {extra}
      </div>
      {children}
    </section>
  )
}

export function Charts({ pie, bars, daily, monthLabel, theme }) {
  const axis = theme === 'dark' ? '#c5d0c8' : '#5c6f66'
  const grid = theme === 'dark' ? '#1e3d34' : '#e6e8e0'
  const dailyHasSpend = daily.some((item) => item.spent > 0)
  const barSummary = useMemo(
    () => bars.map((item) => `${item.full}: income ${pkr(item.income)}, spent ${pkr(item.expense)}`).join('. '),
    [bars],
  )

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <div className="flex min-w-0 xl:col-span-2">
      <Frame kicker="Categories" title={`${monthLabel.split(' ')[0]} spending`} extra={null}>
          {pie.length ? (
            <>
              <div className="relative h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={68} outerRadius={96} paddingAngle={2} stroke="none">
                      {pie.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <p className={label}>Spent</p>
                    <p className="mt-1 text-sm font-semibold">{pkr(pie.reduce((sum, item) => sum + item.value, 0))}</p>
                  </div>
                </div>
              </div>
              <ul className="mt-2 space-y-1.5">
                {pie.map((item) => (
                  <li key={item.name} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-midnight/50 dark:text-ivory/50">{item.pct}%</span>
                    <span className="w-24 text-right font-medium">{pkr(item.value)}</span>
                  </li>
                ))}
              </ul>
              <p className="sr-only">{pie.map((item) => `${item.name} ${pkr(item.value)}`).join(', ')}</p>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-midnight/50 dark:text-ivory/50">No expenses this month yet.</p>
          )}
      </Frame>
      </div>

      <div className="flex min-w-0 xl:col-span-3">
        <Frame
          kicker="Daily"
          title="Spending this month"
          extra={<span className="text-xs text-midnight/45 dark:text-ivory/45">{monthLabel}</span>}
        >
          {dailyHasSpend ? (
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EXPENSE_CHART} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={EXPENSE_CHART} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} interval={daily.length > 16 ? 1 : 0} />
                  <YAxis tickFormatter={compactRupees} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="spent" name="Spent" stroke={EXPENSE_CHART} fill="url(#spendFill)" strokeWidth={2.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-midnight/50 dark:text-ivory/50">No daily spending recorded yet.</p>
          )}
        </Frame>
      </div>

      <div className="xl:col-span-5">
        <Frame
          kicker="Six months"
          title="Income vs expense"
          extra={
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-income" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-expense" /> Expense
              </span>
            </div>
          }
        >
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} barGap={4} barCategoryGap="28%">
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactRupees} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="income" name="Income" fill={INCOME_CHART} radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="expense" name="Expense" fill={EXPENSE_CHART} radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">{barSummary}</p>
        </Frame>
      </div>
    </div>
  )
}
