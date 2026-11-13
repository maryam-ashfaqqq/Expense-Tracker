import { Router } from 'express'
import { asyncRoute, httpError } from '../lib/http.js'
import { serializeRecurring } from '../lib/serialize.js'
import { settleRecurringForUser } from '../lib/settle.js'
import { readRecurringBody } from '../lib/validate.js'
import { Recurring, Transaction } from '../models/index.js'

const router = Router()

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const rows = await Recurring.findAll({
      where: { userId: req.userId },
      order: [
        ['dayOfMonth', 'ASC'],
        ['title', 'ASC'],
      ],
    })
    res.json({ items: rows.map(serializeRecurring) })
  }),
)

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const input = readRecurringBody(req.body)
    const row = await Recurring.create({
      userId: req.userId,
      title: input.title,
      amount: input.amount,
      category: input.category,
      dayOfMonth: input.dayOfMonth,
      active: input.active !== false,
      method: input.method,
      note: input.note || '',
    })
    await settleRecurringForUser(req.userId)
    await row.reload()
    res.status(201).json({ item: serializeRecurring(row) })
  }),
)

router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const row = await Recurring.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!row) throw httpError(404, 'Recurring expense not found.')
    const input = readRecurringBody({ ...serializeRecurring(row), ...req.body }, { partial: true })
    await row.update(input)
    if (row.active) await settleRecurringForUser(req.userId)
    await row.reload()
    res.json({ item: serializeRecurring(row) })
  }),
)

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const row = await Recurring.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!row) throw httpError(404, 'Recurring expense not found.')
    await Transaction.update({ recurring: false, recurringId: null }, { where: { userId: req.userId, recurringId: row.id } })
    await row.destroy()
    res.json({ ok: true })
  }),
)

export default router
