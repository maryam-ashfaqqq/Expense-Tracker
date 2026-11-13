import { currentMonthKey, toIsoDate, uid } from './format.js'

export function settleRecurring(state, today = new Date()) {
  const month = currentMonthKey(today)
  const todayIso = toIsoDate(today)
  let changed = false
  const recurring = state.recurring.map((rule) => ({ ...rule }))
  const transactions = [...state.transactions]

  recurring.forEach((rule) => {
    if (!rule.active) return
    const hasThisMonth = transactions.some((item) => item.recurringId === rule.id && item.date.startsWith(month))
    if (hasThisMonth) {
      if (rule.lastPosted !== month) {
        rule.lastPosted = month
        changed = true
      }
      return
    }
    if (rule.lastPosted === month) return
    const [year, monthNumber] = month.split('-').map(Number)
    const daysInMonth = new Date(year, monthNumber, 0).getDate()
    const day = Math.min(Math.max(1, Number(rule.day) || 1), daysInMonth)
    const date = `${month}-${String(day).padStart(2, '0')}`
    if (date > todayIso) return
    transactions.unshift({
      id: `auto-${rule.id}-${month}`,
      type: 'expense',
      title: rule.title,
      category: rule.category,
      amount: Number(rule.amount),
      date,
      method: rule.method,
      note: rule.note || 'Recurring monthly charge',
      recurringId: rule.id,
      demo: false,
    })
    rule.lastPosted = month
    changed = true
  })

  if (!changed) return state
  return { ...state, recurring, transactions }
}

export function saveTransaction(state, input) {
  const amount = Math.round(Number(input.amount))
  const next = {
    id: input.id || uid(),
    type: input.type,
    title: input.title.trim(),
    category: input.category,
    amount,
    date: input.date,
    method: input.method,
    note: (input.note || '').trim(),
    recurringId: input.recurringId || null,
    demo: Boolean(input.demo),
  }
  let recurring = state.recurring.map((rule) => ({ ...rule }))

  if (input.type === 'expense' && input.makeRecurring) {
    const day = Math.min(31, Math.max(1, Number(input.date.slice(8, 10)) || 1))
    const month = input.date.slice(0, 7)
    const patch = {
      title: next.title,
      category: next.category,
      amount,
      method: next.method,
      note: next.note,
      day,
      active: true,
    }
    const index = recurring.findIndex((rule) => rule.id === next.recurringId)
    if (index >= 0) {
      const current = recurring[index]
      const lastPosted = !current.lastPosted || month > current.lastPosted ? month : current.lastPosted
      recurring[index] = { ...current, ...patch, lastPosted }
    } else {
      const id = uid()
      next.recurringId = id
      recurring.push({ id, ...patch, lastPosted: month })
    }
  } else if (input.type === 'expense' && next.recurringId) {
    recurring = recurring.map((rule) => (rule.id === next.recurringId ? { ...rule, active: false } : rule))
  }

  const exists = state.transactions.some((item) => item.id === next.id)
  const transactions = exists
    ? state.transactions.map((item) => (item.id === next.id ? next : item))
    : [next, ...state.transactions]

  return { ...state, transactions, recurring }
}

export function deleteTransaction(state, id) {
  return { ...state, transactions: state.transactions.filter((item) => item.id !== id) }
}

export function saveBudgets(state, budgets) {
  return { ...state, budgets: { ...budgets } }
}

export function updateRecurring(state, id, patch) {
  return {
    ...state,
    recurring: state.recurring.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
  }
}

export function toggleRecurring(state, id) {
  return {
    ...state,
    recurring: state.recurring.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule)),
  }
}

export function deleteRecurring(state, id) {
  return {
    ...state,
    recurring: state.recurring.filter((rule) => rule.id !== id),
  }
}

export function nextRecurringDate(rule, today = new Date()) {
  const year = today.getFullYear()
  const monthIndex = today.getMonth()
  const monthKey = currentMonthKey(today)
  const build = (y, m) => {
    const days = new Date(y, m + 1, 0).getDate()
    const day = Math.min(Math.max(1, Number(rule.day) || 1), days)
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const thisMonth = build(year, monthIndex)
  const alreadyPosted = rule.lastPosted === monthKey || thisMonth < toIsoDate(today)
  if (!alreadyPosted && thisMonth >= toIsoDate(today)) return thisMonth
  const nextYear = monthIndex === 11 ? year + 1 : year
  const nextMonth = (monthIndex + 1) % 12
  return build(nextYear, nextMonth)
}
