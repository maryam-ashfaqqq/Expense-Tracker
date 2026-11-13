import { createDemoState } from '../../../src/data/demo.js'
import { sequelize } from '../config/db.js'
import { Budget, Recurring, Transaction } from '../models/index.js'
import { withUserLock } from './settle.js'

export function loadDemoForUser(userId) {
  return withUserLock(userId, async () => {
    const demo = createDemoState()
    const latestMonth = {}
    for (const item of demo.transactions) {
      if (!item.recurringId) continue
      const month = item.date.slice(0, 7)
      if (!latestMonth[item.recurringId] || month > latestMonth[item.recurringId]) {
        latestMonth[item.recurringId] = month
      }
    }

    await sequelize.transaction(async (transaction) => {
      await Transaction.destroy({ where: { userId }, transaction })
      await Recurring.destroy({ where: { userId }, transaction })
      await Budget.destroy({ where: { userId }, transaction })
      await Budget.bulkCreate(
        Object.entries(demo.budgets).map(([category, monthlyLimit]) => ({
          userId,
          category,
          monthlyLimit,
        })),
        { transaction },
      )

      const idMap = new Map()
      for (const rule of demo.recurring) {
        const created = await Recurring.create(
          {
            userId,
            title: rule.title,
            amount: rule.amount,
            category: rule.category,
            dayOfMonth: rule.day,
            active: rule.active,
            method: rule.method,
            note: rule.note || '',
            lastPosted: latestMonth[rule.id] || null,
          },
          { transaction },
        )
        idMap.set(rule.id, created.id)
      }

      await Transaction.bulkCreate(
        demo.transactions.map((item) => ({
          userId,
          type: item.type,
          title: item.title,
          category: item.category,
          amount: item.amount,
          date: item.date,
          method: item.method,
          note: item.note || '',
          recurring: Boolean(item.recurringId),
          recurringId: item.recurringId ? idMap.get(item.recurringId) || null : null,
          demo: true,
        })),
        { transaction },
      )
    })
  })
}
