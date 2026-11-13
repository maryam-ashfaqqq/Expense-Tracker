import { Op } from 'sequelize'
import { currentMonthKey, shiftMonth, toIsoDate } from '../../../src/lib/format.js'
import { Recurring, Transaction, User } from '../models/index.js'

const chains = new Map()

function withUserLock(userId, task) {
  const previous = chains.get(userId) || Promise.resolve()
  const run = previous.catch(() => {}).then(task)
  chains.set(userId, run)
  return run.finally(() => {
    if (chains.get(userId) === run) chains.delete(userId)
  })
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber, 0).getDate()
}

function chargeDate(month, dayOfMonth) {
  const day = Math.min(Math.max(1, Number(dayOfMonth) || 1), daysInMonth(month))
  return `${month}-${String(day).padStart(2, '0')}`
}

function monthRange(month) {
  const last = String(daysInMonth(month)).padStart(2, '0')
  return [`${month}-01`, `${month}-${last}`]
}

function monthsDue(rule, today) {
  const todayIso = toIsoDate(today)
  const current = currentMonthKey(today)
  let cursor = rule.lastPosted ? shiftMonth(rule.lastPosted, 1) : current
  const due = []
  while (cursor <= current && due.length < 36) {
    const date = chargeDate(cursor, rule.dayOfMonth)
    if (date <= todayIso) due.push({ month: cursor, date })
    cursor = shiftMonth(cursor, 1)
  }
  return due
}

async function settleUnlocked(userId, today = new Date()) {
  const rules = await Recurring.findAll({ where: { userId, active: true } })
  for (const rule of rules) {
    let latest = rule.lastPosted
    for (const { month, date } of monthsDue(rule, today)) {
      const existing = await Transaction.findOne({
        where: {
          userId,
          recurringId: rule.id,
          date: { [Op.between]: monthRange(month) },
        },
      })
      if (!existing) {
        await Transaction.create({
          userId,
          type: 'expense',
          title: rule.title,
          category: rule.category,
          amount: rule.amount,
          date,
          method: rule.method || 'Bank',
          note: rule.note || 'Recurring monthly charge',
          recurring: true,
          recurringId: rule.id,
          demo: false,
        })
      }
      if (!latest || month > latest) latest = month
    }
    if (latest && latest !== rule.lastPosted) await rule.update({ lastPosted: latest })
  }
}

export function settleRecurringForUser(userId) {
  return withUserLock(userId, () => settleUnlocked(userId))
}

export async function settleAllUsers() {
  const users = await User.findAll({ attributes: ['id'] })
  for (const user of users) {
    await settleRecurringForUser(user.id)
  }
}

export { withUserLock }
