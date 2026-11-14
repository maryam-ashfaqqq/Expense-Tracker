import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { connectDatabase } from './config/db.js'
import { syncModels } from './models/index.js'
import { authRequired } from './middleware/auth.js'
import { settleAllUsers, settleRecurringForUser } from './lib/settle.js'
import authRoutes from './routes/auth.js'
import budgetRoutes from './routes/budgets.js'
import dashboardRoutes from './routes/dashboard.js'
import demoRoutes from './routes/demo.js'
import recurringRoutes from './routes/recurring.js'
import transactionRoutes from './routes/transactions.js'

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to server/.env.')
  process.exit(1)
}

const app = express()
const port = Number(process.env.PORT) || 5000

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)

const api = express.Router()
api.use(authRequired)
api.use(async (req, res, next) => {
  try {
    await settleRecurringForUser(req.userId)
    next()
  } catch (error) {
    next(error)
  }
})
api.use('/transactions', transactionRoutes)
api.use('/budgets', budgetRoutes)
api.use('/recurring', recurringRoutes)
api.use('/dashboard', dashboardRoutes)
api.use('/demo', demoRoutes)
app.use('/api', api)

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  const status = error.status || 500
  if (status >= 500) console.error(error)
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' : error.message })
})

try {
  await connectDatabase()
  await syncModels()
  await settleAllUsers()
} catch (error) {
  console.error('Database connection failed. Check DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in server/.env.')
  console.error(error.message)
  process.exit(1)
}

app.listen(port, () => {
  console.log(`Aurum API listening on http://localhost:${port}`)
})

setInterval(() => {
  settleAllUsers().catch((error) => console.error('Recurring settle failed', error.message))
}, 60 * 60 * 1000)
