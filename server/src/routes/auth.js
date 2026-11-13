import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { sequelize } from '../config/db.js'
import { asyncRoute, httpError } from '../lib/http.js'
import { seedDefaultBudgets } from '../lib/ledgerData.js'
import { serializeUser } from '../lib/serialize.js'
import { cleanText } from '../lib/validate.js'
import { authRequired, signToken } from '../middleware/auth.js'
import { User } from '../models/index.js'

const router = Router()

function readEmail(value) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw httpError(400, 'Enter a valid email address.')
  }
  return email
}

function readPassword(value) {
  const password = String(value ?? '')
  if (password.length < 6) throw httpError(400, 'Use a password of at least 6 characters.')
  if (password.length > 72) throw httpError(400, 'Use a password of 72 characters or fewer.')
  return password
}

router.post(
  '/signup',
  asyncRoute(async (req, res) => {
    const name = cleanText(req.body?.name)
    const email = readEmail(req.body?.email)
    const password = readPassword(req.body?.password)
    if (name.length < 2) throw httpError(400, 'Enter the name you want on the ledger.')
    if (name.length > 60) throw httpError(400, 'Keep your name under 60 characters.')

    const existing = await User.findOne({ where: { email } })
    if (existing) throw httpError(409, 'An account with that email already exists.')

    const user = await sequelize.transaction(async (transaction) => {
      const created = await User.create(
        { name, email, password: await bcrypt.hash(password, 10) },
        { transaction },
      )
      await seedDefaultBudgets(created.id, transaction)
      return created
    })

    res.status(201).json({ token: signToken(user), user: serializeUser(user) })
  }),
)

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const email = readEmail(req.body?.email)
    const password = String(req.body?.password ?? '')
    if (!password) throw httpError(400, 'Enter your password.')

    const user = await User.findOne({ where: { email } })
    const match = user ? await bcrypt.compare(password, user.password) : false
    if (!user || !match) throw httpError(401, 'Email or password is incorrect.')

    res.json({ token: signToken(user), user: serializeUser(user) })
  }),
)

router.get(
  '/me',
  authRequired,
  asyncRoute(async (req, res) => {
    const user = await User.findByPk(req.userId)
    if (!user) throw httpError(401, 'Your session has expired. Sign in again.')
    res.json({ user: serializeUser(user) })
  }),
)

export default router
