import { CATEGORY_COLORS, EXPENSE_CATEGORIES } from '../data/categories.js'
import {
  clamp,
  currentMonthKey,
  formatChange,
  formatMonth,
  formatMonthShort,
  formatShortDate,
  formatWeekdayDate,
  lastNMonthKeys,
  percentChange,
  pkr,
  shiftMonth,
} from './format.js'

function sumAmount(list) {
  return list.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function monthItems(transactions, month, type) {
  return transactions.filter((item) => item.type === type && item.date.startsWith(month))
}

export function monthTotals(transactions, budgets, month) {
  const income = sumAmount(monthItems(transactions, month, 'income'))
  const spent = sumAmount(monthItems(transactions, month, 'expense'))
  const budgetTotal = EXPENSE_CATEGORIES.reduce((sum, category) => sum + Number(budgets[category] || 0), 0)
  return {
    income,
    spent,
    net: income - spent,
    budgetTotal,
    remaining: budgetTotal - spent,
  }
}

function sumCategory(transactions, month, category) {
  return sumAmount(
    transactions.filter((item) => item.type === 'expense' && item.category === category && item.date.startsWith(month)),
  )
}

export function statusFromSpent(spentByCategory, budgets) {
  return EXPENSE_CATEGORIES.map((category) => {
    const spent = Number(spentByCategory?.[category] || 0)
    const budget = Number(budgets?.[category] || 0)
    const ratio = budget > 0 ? spent / budget : spent > 0 ? Infinity : 0
    let level = 'ok'
    if ((budget > 0 && ratio >= 1) || (budget <= 0 && spent > 0)) level = 'over'
    else if (budget > 0 && ratio >= 0.8) level = 'warn'
    return { category, spent, budget, ratio, level }
  })
}

export function budgetStatus(transactions, budgets, month) {
  const spentByCategory = Object.fromEntries(
    EXPENSE_CATEGORIES.map((category) => [category, sumCategory(transactions, month, category)]),
  )
  return statusFromSpent(spentByCategory, budgets)
}

function scoped(transactions, month) {
  return transactions.filter((item) => item.date.slice(0, 7) <= month)
}

function categorySwings(transactions, month) {
  const previousMonth = shiftMonth(month, -1)
  return EXPENSE_CATEGORIES.map((category) => {
    const current = sumCategory(transactions, month, category)
    const previous = sumCategory(transactions, previousMonth, category)
    const pct = previous > 0 ? ((current - previous) / previous) * 100 : null
    return { category, current, previous, pct }
  })
    .filter((item) => item.pct !== null && item.previous >= 1000 && item.current !== item.previous)
    .sort(
      (a, b) =>
        Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous) || Math.abs(b.pct) - Math.abs(a.pct),
    )
}

function swingInsight(swing, prevLabel, kicker) {
  const up = swing.pct > 0
  const pct = Math.abs(Math.round(swing.pct))
  return {
    id: `swing-${swing.category}`,
    tone: up ? 'warn' : 'good',
    kicker,
    category: swing.category,
    text: `You spent ${pct}% ${up ? 'more' : 'less'} on ${swing.category} this month (${pkr(swing.current)} vs ${pkr(swing.previous)} in ${prevLabel}).`,
  }
}

function peakDayInsight(transactions, month) {
  const expenses = monthItems(transactions, month, 'expense')
  const byDay = new Map()
  expenses.forEach((item) => {
    const current = byDay.get(item.date) || []
    current.push(item)
    byDay.set(item.date, current)
  })
  let best = null
  byDay.forEach((items, date) => {
    const total = sumAmount(items)
    if (!best || total > best.total) {
      const lead = [...items].sort((a, b) => b.amount - a.amount)[0]
      best = { date, total, lead, count: items.length }
    }
  })
  if (!best) return null
  const payments = best.count === 1 ? '1 payment' : `${best.count} payments`
  return {
    id: 'peak-day',
    tone: 'neutral',
    kicker: 'Peak day',
    text: `Your highest spending day was ${formatWeekdayDate(best.date)} — ${pkr(best.total)} across ${payments}, led by ${best.lead.title}.`,
  }
}

function breachInsight(statuses) {
  const over = statuses
    .filter((item) => item.level === 'over' && item.budget > 0)
    .sort((a, b) => b.ratio - a.ratio)[0]
  if (!over) return null
  return {
    id: `breach-${over.category}`,
    tone: 'bad',
    kicker: 'Budget alert',
    category: over.category,
    text: `${over.category} is over budget at ${pkr(over.spent)} against a ${pkr(over.budget)} limit (${Math.round(over.ratio * 100)}% used).`,
  }
}

function savingsInsight(totals) {
  if (totals.income <= 0) return null
  const pct = Math.round((totals.net / totals.income) * 100)
  return {
    id: 'savings',
    tone: totals.net >= 0 ? 'good' : 'bad',
    kicker: 'Savings',
    text:
      totals.net >= 0
        ? `You kept ${pkr(totals.net)} this month — ${pct}% of income is still unspent.`
        : `Spending ran ${pkr(Math.abs(totals.net))} past income this month.`,
  }
}

function methodInsight(transactions, month) {
  const expenses = monthItems(transactions, month, 'expense')
  if (!expenses.length) return null
  const counts = new Map()
  expenses.forEach((item) => counts.set(item.method, (counts.get(item.method) || 0) + 1))
  const [method, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    id: 'method',
    tone: 'neutral',
    kicker: 'Payment habit',
    text: `${method} was your most used payment method, on ${count} of ${expenses.length} expenses this month.`,
  }
}

function largestInsight(transactions, month) {
  const top = monthItems(transactions, month, 'expense').sort((a, b) => b.amount - a.amount)[0]
  if (!top) return null
  return {
    id: 'largest',
    tone: 'neutral',
    kicker: 'Largest payment',
    text: `${top.title} was your biggest single payment this month at ${pkr(top.amount)}.`,
  }
}

export function buildInsights(transactions, budgets, month) {
  const prevLabel = formatMonth(shiftMonth(month, -1)).split(' ')[0]
  const swings = categorySwings(transactions, month)
  const insights = []
  if (swings[0]) insights.push(swingInsight(swings[0], prevLabel, 'Spending shift'))
  const peak = peakDayInsight(transactions, month)
  if (peak) insights.push(peak)

  const used = new Set(insights.filter((item) => item.category).map((item) => item.category))
  const breach = breachInsight(budgetStatus(transactions, budgets, month))
  if (breach && !used.has(breach.category)) insights.push(breach)
  else if (swings[1]) insights.push(swingInsight(swings[1], prevLabel, 'Also moving'))

  const totals = monthTotals(transactions, budgets, month)
  const extras = [savingsInsight(totals), methodInsight(transactions, month), largestInsight(transactions, month)].filter(Boolean)
  extras.forEach((item) => {
    if (insights.length < 3 && !insights.some((existing) => existing.id === item.id)) insights.push(item)
  })

  if (!insights.length) {
    return [
      {
        id: 'empty',
        tone: 'neutral',
        kicker: 'Getting started',
        text: 'Add income and expenses for this month and Aurum will read the pattern for you.',
      },
    ]
  }
  return insights.slice(0, 3)
}

function pieData(transactions, month) {
  const total = sumAmount(monthItems(transactions, month, 'expense'))
  return EXPENSE_CATEGORIES.map((category) => ({
    name: category,
    value: sumCategory(transactions, month, category),
    color: CATEGORY_COLORS[category],
  }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ ...item, pct: total ? Math.round((item.value / total) * 100) : 0 }))
}

function dailySpending(transactions, month, today) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const isCurrent = month === currentMonthKey(today)
  const lastDay = isCurrent ? Math.min(today.getDate(), daysInMonth) : daysInMonth
  const days = []
  for (let day = 1; day <= lastDay; day += 1) {
    const iso = `${month}-${String(day).padStart(2, '0')}`
    const spent = sumAmount(transactions.filter((item) => item.type === 'expense' && item.date === iso))
    days.push({ iso, day: String(day), label: formatShortDate(iso), spent })
  }
  return days
}

function cardModel({ key, label, amount, change, goodWhenUp, detail, bar, barLabel, tone }) {
  return { key, label, amount, change, changeLabel: formatChange(change), goodWhenUp, detail, bar: clamp(bar), barLabel, tone }
}

export function buildDashboard(transactions, budgets, today = new Date()) {
  const month = currentMonthKey(today)
  const previous = shiftMonth(month, -1)
  const totals = monthTotals(transactions, budgets, month)
  const previousTotals = monthTotals(transactions, budgets, previous)
  const visible = scoped(transactions, month)
  const openingIncome = sumAmount(visible.filter((item) => item.type === 'income' && item.date < `${month}-01`))
  const openingSpent = sumAmount(visible.filter((item) => item.type === 'expense' && item.date < `${month}-01`))
  const opening = openingIncome - openingSpent
  const balance = opening + totals.net
  const savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : 0
  const spentRatio = totals.budgetTotal > 0 ? (totals.spent / totals.budgetTotal) * 100 : 0
  const remainingRatio = totals.budgetTotal > 0 ? (Math.max(totals.remaining, 0) / totals.budgetTotal) * 100 : 0
  const statuses = budgetStatus(transactions, budgets, month)
  const monthKeys = lastNMonthKeys(6, today)
  const spanYears = new Set(monthKeys.map((key) => key.slice(0, 4))).size > 1

  return {
    month,
    monthLabel: formatMonth(month),
    prevLabel: formatMonth(previous),
    totals,
    previousTotals,
    balance,
    cards: [
      cardModel({
        key: 'balance',
        label: 'Total balance',
        amount: balance,
        change: percentChange(balance, opening),
        goodWhenUp: true,
        detail: `${pkr(totals.net)} net this month`,
        bar: Math.max(savingsRate, 0),
        barLabel:
          savingsRate >= 0
            ? `Saved ${Math.round(savingsRate)}% of ${formatMonth(month).split(' ')[0]} income`
            : 'Spent more than this month’s income',
        tone: 'gold',
      }),
      cardModel({
        key: 'income',
        label: 'Total income',
        amount: totals.income,
        change: percentChange(totals.income, previousTotals.income),
        goodWhenUp: true,
        detail: `Last month ${pkr(previousTotals.income)}`,
        bar: previousTotals.income > 0 ? (totals.income / previousTotals.income) * 100 : totals.income > 0 ? 100 : 0,
        barLabel: `${formatMonth(month).split(' ')[0]} income against ${formatMonth(previous).split(' ')[0]}`,
        tone: 'income',
      }),
      cardModel({
        key: 'spent',
        label: 'Total spent',
        amount: totals.spent,
        change: percentChange(totals.spent, previousTotals.spent),
        goodWhenUp: false,
        detail: `Last month ${pkr(previousTotals.spent)}`,
        bar: spentRatio,
        barLabel: `${Math.round(spentRatio)}% of the ${pkr(totals.budgetTotal)} monthly budget`,
        tone: spentRatio >= 100 ? 'expense' : spentRatio >= 80 ? 'warn' : 'gold',
      }),
      cardModel({
        key: 'remaining',
        label: 'Remaining budget',
        amount: totals.remaining,
        change: percentChange(totals.remaining, previousTotals.remaining),
        goodWhenUp: true,
        detail:
          totals.remaining >= 0
            ? `${Math.round(remainingRatio)}% of the budget is left`
            : `Over budget by ${pkr(Math.abs(totals.remaining))}`,
        bar: remainingRatio,
        barLabel: totals.remaining >= 0 ? 'Still available this month' : 'Every category limit is used up',
        tone: totals.remaining < 0 ? 'expense' : 'gold',
      }),
    ],
    alerts: statuses
      .filter((item) => item.level === 'warn' || item.level === 'over')
      .sort((a, b) => (b.ratio === Infinity ? 1 : b.ratio) - (a.ratio === Infinity ? 1 : a.ratio)),
    insights: buildInsights(transactions, budgets, month),
    pie: pieData(transactions, month),
    bars: monthKeys.map((key) => ({
      key,
      label: formatMonthShort(key, spanYears),
      full: formatMonth(key),
      income: monthTotals(transactions, budgets, key).income,
      expense: monthTotals(transactions, budgets, key).spent,
    })),
    daily: dailySpending(transactions, month, today),
    recent: [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
      .slice(0, 6),
    statuses,
  }
}

export function availableMonths(transactions) {
  return [...new Set(transactions.map((item) => item.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a))
}

export function filterTransactions(list, { query = '', category = 'all', month = 'all', method = 'all', sort = 'newest' } = {}) {
  const needle = query.trim().toLowerCase()
  const filtered = list.filter((item) => {
    if (needle && !item.title.toLowerCase().includes(needle)) return false
    if (category !== 'all' && item.category !== category) return false
    if (month !== 'all' && !item.date.startsWith(month)) return false
    if (method !== 'all' && item.method !== method) return false
    return true
  })
  const sorters = {
    newest: (a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)),
    oldest: (a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)),
    'amount-desc': (a, b) => b.amount - a.amount || b.date.localeCompare(a.date),
    'amount-asc': (a, b) => a.amount - b.amount || a.date.localeCompare(b.date),
    title: (a, b) => a.title.localeCompare(b.title),
  }
  return [...filtered].sort(sorters[sort] || sorters.newest)
}
