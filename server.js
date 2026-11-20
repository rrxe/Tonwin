import 'dotenv/config'
import express from 'express'
import compression from 'compression'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import appApi from './api/app.js'
import adminApi from './api/admin.js'
import { handleWebhook, setupWebhook, startScheduler } from './lib/bot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.set('trust proxy', true)
app.use(compression())
app.use(express.json({ limit: '1mb' }))

const wrap = (h) => (req, res) =>
  Promise.resolve(h(req, res)).catch((e) => {
    console.error(e)
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'server' })
  })

app.post('/api/app', wrap(appApi))
app.all('/api/admin', wrap(adminApi))
app.post('/api/telegram/webhook', wrap(handleWebhook))

// لوحة الأدمن (صفحة ثابتة، محمية بـ ADMIN_SECRET داخل الـ API)
app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})

const dist = path.join(__dirname, 'dist')
app.use(express.static(dist, {
  maxAge: '1y', immutable: true, index: false,
  setHeaders(res, f) { if (f.endsWith('.html')) res.setHeader('Cache-Control', 'no-store') },
}))
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' })
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(dist, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Crystara running on :${PORT}`)
  startScheduler()
  setupWebhook().catch((e) => console.error('[bot] webhook:', e?.message))
})
