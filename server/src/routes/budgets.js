import { Router } from 'express'
import { asyncRoute } from '../lib/http.js'
import { budgetSnapshot, saveBudgetMap } from '../lib/ledgerData.js'

const router = Router()

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { budgets, spent, statuses } = await budgetSnapshot(req.userId)
    const alerts = statuses
      .filter((item) => item.level === 'warn' || item.level === 'over')
      .map((item) => ({
        ...item,
        level: item.level === 'over' ? 'alert' : 'warning',
        message: item.level === 'over' ? 'Spending is over the monthly limit.' : 'Spending is above 80% of the monthly limit.',
      }))
    res.json({ budgets, spent, statuses, alerts })
  }),
)

router.post(
  '/',
  asyncRoute(async (req, res) => {
    await saveBudgetMap(req.userId, req.body)
    const { budgets, spent, statuses } = await budgetSnapshot(req.userId)
    res.json({ budgets, spent, statuses })
  }),
)

export default router
