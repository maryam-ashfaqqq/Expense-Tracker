import { Router } from 'express'
import { buildDashboard } from '../../../src/lib/analytics.js'
import { asyncRoute } from '../lib/http.js'
import { budgetSnapshot } from '../lib/ledgerData.js'

const router = Router()

router.get(
  '/stats',
  asyncRoute(async (req, res) => {
    const { budgets, transactions, statuses } = await budgetSnapshot(req.userId)
    const dash = buildDashboard(transactions, budgets)
    const alerts = statuses
      .filter((item) => item.level === 'warn' || item.level === 'over')
      .map((item) => ({
        category: item.category,
        spent: item.spent,
        budget: item.budget,
        ratio: Number.isFinite(item.ratio) ? item.ratio : null,
        level: item.level === 'over' ? 'alert' : 'warning',
        message:
          item.level === 'over'
            ? `${item.category} is over its monthly budget.`
            : `${item.category} has used more than 80% of its monthly budget.`,
      }))

    res.json({
      ...dash,
      alerts: dash.alerts.map((item) => ({
        ...item,
        ratio: Number.isFinite(item.ratio) ? item.ratio : null,
        status: item.level === 'over' ? 'alert' : 'warning',
      })),
      budgetAlerts: alerts,
      sample: transactions.some((item) => item.demo),
      balance: dash.balance,
      income: dash.totals.income,
      spent: dash.totals.spent,
      remaining: dash.totals.remaining,
      changes: {
        balance: dash.cards.find((card) => card.key === 'balance')?.change ?? 0,
        income: dash.cards.find((card) => card.key === 'income')?.change ?? 0,
        spent: dash.cards.find((card) => card.key === 'spent')?.change ?? 0,
        remaining: dash.cards.find((card) => card.key === 'remaining')?.change ?? 0,
      },
    })
  }),
)

export default router
