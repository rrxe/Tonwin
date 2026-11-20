import crypto from 'node:crypto'
import { db } from './supabase.js'
import { getSettings } from './settings.js'
import { tg, esc, appLink } from './telegram.js'
import { notify } from './game.js'

const publicUrl = () => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '')

function secret() {
  return (
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    crypto.createHash('sha256').update(`wh:${process.env.TELEGRAM_BOT_TOKEN || ''}`).digest('hex').slice(0, 48)
  )
}

export async function setupWebhook() {
  const base = publicUrl()
  if (!base || !process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[bot] PUBLIC_URL أو TELEGRAM_BOT_TOKEN ناقص — ما انضبط الـ webhook')
    return
  }
  const r = await tg('setWebhook', {
    url: `${base}/api/telegram/webhook`,
    secret_token: secret(),
    allowed_updates: ['message', 'my_chat_member'],
  })
  console.log('[bot] setWebhook:', r?.ok ? 'ok' : r?.description)
}

export async function handleWebhook(req, res) {
  if (req.headers['x-telegram-bot-api-secret-token'] !== secret()) return res.sendStatus(401)
  res.sendStatus(200) // رد سريع
  try {
    const u = req.body || {}
    if (u.my_chat_member?.chat?.type === 'private') {
      const blocked = ['kicked', 'left'].includes(u.my_chat_member.new_chat_member?.status)
      await db.from('players').update({ bot_blocked: blocked }).eq('telegram_id', String(u.my_chat_member.chat.id))
      return
    }
    const m = u.message
    if (!m?.text || m.chat.type !== 'private') return
    if (!m.text.startsWith('/start')) return

    const payload = m.text.split(/\s+/)[1] || ''
    const ref = /^ref_\d{3,20}$/.test(payload) ? payload : ''
    const s = await getSettings()
    const name = esc(m.from.first_name || '')
    const lang = String(m.from.language_code || '').startsWith('ar') ? 'ar' : 'en'

    const text =
      lang === 'ar'
        ? `💎 أهلاً <b>${name}</b> في <b>${'STORMY'}</b>\n\n⛏️ عدّن كريستال كل ${s.mining_cycle_hours} ساعة\n🎡 لفّ العجلة واربح حتى 15 كريستال\n👥 ادعُ أصدقاءك واربح من نشاطهم\n💵 كل ${s.crystals_per_usd} كريستال = 1$\n\n👇 اضغط وابدأ`
        : `💎 Welcome <b>${name}</b> to <b>${'STORMY'}</b>\n\n⛏️ Mine crystals every ${s.mining_cycle_hours}h\n🎡 Spin the wheel for up to 15 crystals\n👥 Invite friends and earn from them\n💵 ${s.crystals_per_usd} crystals = $1\n\n👇 Tap to start`

    const label = lang === 'ar' ? 'افتح التطبيق 💎' : 'Open app 💎'
    const button = process.env.MINI_APP_SHORT_NAME
      ? { text: label, url: appLink(ref) }
      : { text: label, web_app: { url: `${publicUrl()}/${ref ? `?ref=${ref}` : ''}` } }

    await tg('sendMessage', {
      chat_id: m.chat.id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[button]] },
    })
    await db.from('players').update({ bot_blocked: false }).eq('telegram_id', String(m.from.id))
  } catch (e) {
    console.error('[bot]', e?.message || e)
  }
}

/** إشعار "التعدين جاهز" */
export function startScheduler() {
  const tick = async () => {
    try {
      const s = await getSettings()
      const cutoff = new Date(Date.now() - s.mining_cycle_hours * 3600e3).toISOString()
      const { data } = await db.from('players').select('telegram_id, lang')
        .eq('mining_active', true).eq('mining_notified', false).eq('bot_blocked', false).lte('mining_started_at', cutoff).limit(150)
      for (const p of data || []) {
        const { data: won } = await db.from('players').update({ mining_notified: true }).eq('telegram_id', p.telegram_id).eq('mining_notified', false).select('telegram_id')
        if (!won?.length) continue
        await notify(p.telegram_id, p.lang === 'en' ? '💎 Your crystals are ready to collect!' : '💎 كريستالاتك جاهزة للاستلام!')
        await new Promise((r) => setTimeout(r, 60))
      }
    } catch (e) {
      console.error('[scheduler]', e?.message || e)
    }
  }
  setInterval(tick, 120000)
}
