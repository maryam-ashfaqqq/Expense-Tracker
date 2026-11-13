import { Router } from 'express'
import { loadDemoForUser } from '../lib/demo.js'
import { asyncRoute } from '../lib/http.js'

const router = Router()

router.post(
  '/',
  asyncRoute(async (req, res) => {
    await loadDemoForUser(req.userId)
    res.json({ ok: true, message: 'Demo data loaded for June through November 2026.' })
  }),
)

export default router
