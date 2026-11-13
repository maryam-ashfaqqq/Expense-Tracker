import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHODS } from '../../../src/data/categories.js'
import { httpError } from './http.js'

export function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function isRealDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function readTransactionBody(body) {
  const type = body?.type === 'income' ? 'income' : body?.type === 'expense' ? 'expense' : ''
  const title = cleanText(body?.title)
  const category = cleanText(body?.category)
  const amount = Number(body?.amount)
  const date = String(body?.date || '')
  const method = body?.method
  const note = String(body?.note ?? '').trim()
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  if (type !== 'income' && type !== 'expense') throw httpError(400, 'Choose income or expense.')
  if (title.length < 2) throw httpError(400, 'Add a short title.')
  if (title.length > 80) throw httpError(400, 'Keep the title under 80 characters.')
  if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Enter an amount greater than zero.')
  if (amount > 100000000) throw httpError(400, 'Enter an amount under Rs 100,000,000.')
  if (!isRealDate(date)) throw httpError(400, 'Choose a valid date.')
  if (!categories.includes(category)) throw httpError(400, 'Choose a category.')
  if (!METHODS.includes(method)) throw httpError(400, 'Choose a payment method.')
  if (note.length > 180) throw httpError(400, 'Keep the note under 180 characters.')

  return {
    type,
    title,
    category,
    amount: Math.round(amount),
    date,
    method,
    note,
    makeRecurring: type === 'expense' && Boolean(body?.makeRecurring),
    recurringId: body?.recurringId ? Number(body.recurringId) : null,
  }
}

export function readRecurringBody(body, { partial = false } = {}) {
  const patch = {}
  if (!partial || body.title !== undefined) {
    const title = cleanText(body?.title)
    if (title.length < 2) throw httpError(400, 'Add a title.')
    if (title.length > 80) throw httpError(400, 'Keep the title under 80 characters.')
    patch.title = title
  }
  if (!partial || body.category !== undefined) {
    const category = cleanText(body?.category)
    if (!EXPENSE_CATEGORIES.includes(category)) throw httpError(400, 'Choose a category.')
    patch.category = category
  }
  if (!partial || body.amount !== undefined) {
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Enter an amount greater than zero.')
    if (amount > 100000000) throw httpError(400, 'Enter an amount under Rs 100,000,000.')
    patch.amount = Math.round(amount)
  }
  if (!partial || body.day !== undefined || body.dayOfMonth !== undefined) {
    const day = Number(body?.dayOfMonth ?? body?.day)
    if (!Number.isInteger(day) || day < 1 || day > 31) throw httpError(400, 'Use a day between 1 and 31.')
    patch.dayOfMonth = day
  }
  if (!partial || body.method !== undefined) {
    if (!METHODS.includes(body?.method)) throw httpError(400, 'Choose a payment method.')
    patch.method = body.method
  }
  if (!partial || body.note !== undefined) {
    const note = String(body?.note ?? '').trim()
    if (note.length > 180) throw httpError(400, 'Keep the note under 180 characters.')
    patch.note = note
  }
  if (body?.active !== undefined) patch.active = Boolean(body.active)
  if (!partial && patch.active === undefined) patch.active = true
  return patch
}
