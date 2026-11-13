import { Op } from 'sequelize'
import { Router } from 'express'
import { currentMonthKey } from '../../../src/lib/format.js'
import { sequelize } from '../config/db.js'
import { asyncRoute, httpError } from '../lib/http.js'
import { serializeTransaction } from '../lib/serialize.js'
import { readTransactionBody } from '../lib/validate.js'
import { Recurring, Transaction } from '../models/index.js'

const router = Router()

const SORTS = {
  newest: [
    ['date', 'DESC'],
    ['id', 'DESC'],
  ],
  oldest: [
    ['date', 'ASC'],
    ['id', 'ASC'],
  ],
  'amount-desc': [
    ['amount', 'DESC'],
    ['date', 'DESC'],
  ],
  'amount-asc': [
    ['amount', 'ASC'],
    ['date', 'ASC'],
  ],
  title: [
    ['title', 'ASC'],
    ['id', 'ASC'],
  ],
}

async function linkRecurring(userId, row, input, transaction) {
  if (input.type !== 'expense') {
    if (row.recurring || row.recurringId) await row.update({ recurring: false, recurringId: null }, { transaction })
    return
  }

  const month = input.date.slice(0, 7)
  const day = Math.min(31, Math.max(1, Number(input.date.slice(8, 10)) || 1))

  if (input.makeRecurring) {
    const fields = {
      title: input.title,
      category: input.category,
      amount: input.amount,
      method: input.method,
      note: input.note,
      dayOfMonth: day,
      active: true,
    }
    let rule = null
    if (input.recurringId) {
      rule = await Recurring.findOne({ where: { id: input.recurringId, userId }, transaction })
    }
    if (rule) {
      const lastPosted = !rule.lastPosted || month > rule.lastPosted ? month : rule.lastPosted
      await rule.update({ ...fields, lastPosted }, { transaction })
    } else {
      rule = await Recurring.create({ userId, ...fields, lastPosted: month }, { transaction })
    }
    await row.update({ recurring: true, recurringId: rule.id }, { transaction })
    return
  }

  if (input.recurringId) {
    const rule = await Recurring.findOne({ where: { id: input.recurringId, userId }, transaction })
    if (rule && rule.active) await rule.update({ active: false }, { transaction })
    await row.update({ recurring: true, recurringId: input.recurringId }, { transaction })
  }
}

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const where = { userId: req.userId }
    const search = String(req.query.search || '').trim().slice(0, 80)
    const category = String(req.query.category || '').trim()
    const method = String(req.query.method || '').trim()
    const month = String(req.query.month || '').trim()
    const sort = SORTS[req.query.sort] ? req.query.sort : 'newest'
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 10))
    const page = Math.max(1, Number(req.query.page) || 1)

    if (search) where.title = { [Op.substring]: search }
    if (category && category !== 'all') where.category = category
    if (method && method !== 'all') where.method = method
    if (month && month !== 'all') {
      if (!/^\d{4}-\d{2}$/.test(month)) throw httpError(400, 'Choose a valid month.')
      const [year, monthNumber] = month.split('-').map(Number)
      const lastDay = new Date(year, monthNumber, 0).getDate()
      where.date = { [Op.between]: [`${month}-01`, `${month}-${String(lastDay).padStart(2, '0')}`] }
    }

    const [{ rows, count }, dates] = await Promise.all([
      Transaction.findAndCountAll({
        where,
        order: SORTS[sort],
        limit,
        offset: (page - 1) * limit,
      }),
      Transaction.findAll({
        where: { userId: req.userId },
        attributes: ['date'],
        raw: true,
      }),
    ])

    const months = [...new Set(dates.map((item) => String(item.date).slice(0, 7)).filter(Boolean))]
    const todayMonth = currentMonthKey()
    if (!months.includes(todayMonth)) months.push(todayMonth)
    months.sort((a, b) => b.localeCompare(a))

    res.json({
      items: rows.map(serializeTransaction),
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
      limit,
      months,
    })
  }),
)

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const input = readTransactionBody(req.body)
    const created = await sequelize.transaction(async (transaction) => {
      const row = await Transaction.create(
        {
          userId: req.userId,
          type: input.type,
          title: input.title,
          category: input.category,
          amount: input.amount,
          date: input.date,
          method: input.method,
          note: input.note,
          recurring: false,
          demo: false,
        },
        { transaction },
      )
      await linkRecurring(req.userId, row, input, transaction)
      return row
    })
    await created.reload()
    res.status(201).json({ item: serializeTransaction(created) })
  }),
)

router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const input = readTransactionBody({ ...req.body, recurringId: req.body?.recurringId })
    const updated = await sequelize.transaction(async (transaction) => {
      const row = await Transaction.findOne({
        where: { id: req.params.id, userId: req.userId },
        transaction,
      })
      if (!row) throw httpError(404, 'Transaction not found.')
      await row.update(
        {
          type: input.type,
          title: input.title,
          category: input.category,
          amount: input.amount,
          date: input.date,
          method: input.method,
          note: input.note,
          demo: row.demo,
        },
        { transaction },
      )
      const recurringId = input.recurringId || row.recurringId
      await linkRecurring(req.userId, row, { ...input, recurringId }, transaction)
      return row
    })
    await updated.reload()
    res.json({ item: serializeTransaction(updated) })
  }),
)

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const deleted = await Transaction.destroy({ where: { id: req.params.id, userId: req.userId } })
    if (!deleted) throw httpError(404, 'Transaction not found.')
    res.json({ ok: true })
  }),
)

export default router
