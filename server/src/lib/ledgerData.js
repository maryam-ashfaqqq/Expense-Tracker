import { DEFAULT_BUDGETS, EXPENSE_CATEGORIES } from '../../../src/data/categories.js'
import { budgetStatus } from '../../../src/lib/analytics.js'
import { currentMonthKey } from '../../../src/lib/format.js'
import { sequelize } from '../config/db.js'
import { Budget, Transaction } from '../models/index.js'
import { serializeTransaction } from './serialize.js'

export async function budgetsForUser(userId) {
  const rows = await Budget.findAll({ where: { userId } })
  if (!rows.length) return { ...DEFAULT_BUDGETS }
  const budgets = {}
  for (const category of EXPENSE_CATEGORIES) {
    const row = rows.find((item) => item.category === category)
    budgets[category] = row ? Number(row.monthlyLimit) : 0
  }
  return budgets
}

export async function transactionsForUser(userId) {
  const rows = await Transaction.findAll({
    where: { userId },
    order: [
      ['date', 'DESC'],
      ['id', 'DESC'],
    ],
  })
  return rows.map(serializeTransaction)
}

export async function budgetSnapshot(userId) {
  const [budgets, transactions] = await Promise.all([budgetsForUser(userId), transactionsForUser(userId)])
  const statuses = budgetStatus(transactions, budgets, currentMonthKey())
  const spent = Object.fromEntries(statuses.map((item) => [item.category, item.spent]))
  return { budgets, spent, statuses, transactions }
}

export async function seedDefaultBudgets(userId, transaction) {
  await Budget.bulkCreate(
    Object.entries(DEFAULT_BUDGETS).map(([category, monthlyLimit]) => ({
      userId,
      category,
      monthlyLimit,
    })),
    { transaction },
  )
}

export async function saveBudgetMap(userId, input) {
  const source = input?.budgets && typeof input.budgets === 'object' ? input.budgets : input
  await sequelize.transaction(async (transaction) => {
    for (const category of EXPENSE_CATEGORIES) {
      const amount = Number(source?.[category])
      if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
        const error = new Error(`Enter a zero or positive budget for ${category}.`)
        error.status = 400
        throw error
      }
      const monthlyLimit = Math.round(amount)
      const [row] = await Budget.findOrCreate({
        where: { userId, category },
        defaults: { userId, category, monthlyLimit },
        transaction,
      })
      if (Number(row.monthlyLimit) !== monthlyLimit) await row.update({ monthlyLimit }, { transaction })
    }
  })
}
