import crypto from 'node:crypto'
import { db } from './supabase.js'
import { tg, esc, appLink } from './telegram.js'

const TZ = Number(process.env.TZ_OFFSET_HOURS ?? 3) // بغداد افتراضياً

export const dayKey = (ts = Date.now()) => new Date(ts + TZ * 3600e3).toISOString().slice(0, 10)
export const round3 = (n) => Math.round(n * 1000) / 1000

export function hashVal(v) {
  if (!v) return null
  const salt = process.env.SECURITY_SALT || process.env.TELEGRAM_BOT_TOKEN || 'crystara'
  return crypto.createHash('sha256').update(`${salt}:${v}`).digest('hex').slice(0, 32)
}

export function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return xf || req.socket?.remoteAddress || ''
}

/* ------------------------------------------------------------------ */
/* التعدين                                                              */
/* ------------------------------------------------------------------ */
export function miningBonusPercent(qualifiedRefs, s) {
  return Math.min(s.ref_mining_bonus_cap, qualifiedRefs * s.ref_mining_bonus_per_ref)
}

export function miningState(p, s, bonusPercent = 0) {
  const cycleMs = s.mining_cycle_hours * 3600e3
  const started = p.mining_started_at ? new Date(p.mining_started_at).getTime() : null
  const readyAt = p.mining_active && started ? started + cycleMs : null
  const base = s.mining_reward
  return {
    active: !!p.mining_active,
    startedAt: started ? new Date(started).toISOString() : null,
    readyAt: readyAt ? new Date(readyAt).toISOString() : null,
    ready: !!readyAt && Date.now() >= readyAt,
    cycleMs,
    base,
    bonusPercent,
    reward: round3(base * (1 + bonusPercent / 100)),
    adStart: s.mining_ad_start && s.require_ads,
    adClaim: s.mining_ad_claim && s.require_ads,
  }
}

/* ------------------------------------------------------------------ */
/* العجلة: اختيار موزون                                                 */
/* ------------------------------------------------------------------ */
export function pickWeighted(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = crypto.randomInt(0, Math.max(1, Math.round(total * 1000))) / 1000
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i + 1
  }
  return weights.length
}

/* ------------------------------------------------------------------ */
/* نبضة الإعلان (تحقق من وقت المشاهدة على السيرفر)                       */
/* ------------------------------------------------------------------ */
const pulses = new Map() // tid -> { slot, beganAt, lastConfirmedAt }
const MIN_WATCH_MS = 4500

export function pulseBegin(tid, slot, s) {
  if (!s.require_ads) return { ok: true }
  const now = Date.now()
  const st = pulses.get(tid) || {}
  const gap = Math.max(0, (s.ad_cooldown_s - 1) * 1000)
  const left = st.lastConfirmedAt ? gap - (now - st.lastConfirmedAt) : 0
  if (left > 0) return { ok: false, wait: Math.ceil(left / 1000) }
  pulses.set(tid, { ...st, slot, beganAt: now })
  if (pulses.size > 20000) {
    for (const [k, v] of pulses) if (now - (v.beganAt || 0) > 600e3) pulses.delete(k)
  }
  return { ok: true }
}

export function pulseConsume(tid, slot, watchedMs, s) {
  if (!s.require_ads) return { ok: true }
  const st = pulses.get(tid)
  const now = Date.now()
  if (!st?.beganAt || st.slot !== slot) return { ok: false, err: 'ad_not_started' }
  if (now - st.beganAt > 600e3) return { ok: false, err: 'ad_expired' }
  if (now - st.beganAt < MIN_WATCH_MS) return { ok: false, err: 'ad_too_short' }
  if (!(Number(watchedMs) >= MIN_WATCH_MS)) return { ok: false, err: 'ad_too_short' }
  st.beganAt = 0
  st.lastConfirmedAt = now
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* منح الكريستال + عمولة الإحالة + تأهيل الإحالة                          */
/* ------------------------------------------------------------------ */
export async function earn(p, amount, source, s, { detail = null, ad = false } = {}) {
  amount = round3(amount)
  const { data: bal, error } = await db.rpc('add_crystals', {
    p_tid: p.telegram_id, p_delta: amount, p_source: source, p_detail: detail, p_ad: ad,
  })
  if (error) throw error
  if (bal === null) throw new Error('balance_error')
  afterEarn(p, amount, ad, s).catch((e) => console.error('[afterEarn]', e?.message))
  return Number(bal)
}

async function afterEarn(p, amount, ad, s) {
  if (!p.referred_by || p.is_dup) return
  // عمولة من أرباح المُحال
  const comm = round3((amount * s.ref_commission_percent) / 100)
  if (comm > 0) {
    await db.rpc('add_crystals', {
      p_tid: p.referred_by, p_delta: comm, p_source: 'ref_commission', p_detail: p.telegram_id, p_ad: false,
    })
  }
  // تأهيل الإحالة (مكافأة ثابتة مرة وحدة)
  if (ad && !p.ref_paid) {
    const { data: fresh } = await db.from('players').select('ads_watched, ref_paid').eq('telegram_id', p.telegram_id).single()
    if (fresh && !fresh.ref_paid && fresh.ads_watched >= s.ref_required_ads) {
      const { data: won } = await db.from('players').update({ ref_paid: true }).eq('telegram_id', p.telegram_id).eq('ref_paid', false).select('telegram_id')
      if (won?.length && s.ref_reward > 0) {
        await db.rpc('add_crystals', {
          p_tid: p.referred_by, p_delta: s.ref_reward, p_source: 'referral', p_detail: p.telegram_id, p_ad: false,
        })
        notify(p.referred_by, `👥 <b>${esc(p.first_name || 'صديقك')}</b> أصبح إحالة مؤهلة!\n💎 +${s.ref_reward} كريستال`).catch(() => {})
      }
    }
  }
}

export async function notify(tid, html, withButton = true) {
  const body = { chat_id: tid, text: html, parse_mode: 'HTML', disable_web_page_preview: true }
  if (withButton) body.reply_markup = { inline_keyboard: [[{ text: '💎 Open', url: appLink('') }]] }
  const r = await tg('sendMessage', body)
  if (r && r.ok === false && (r.error_code === 403 || /blocked/i.test(r.description || ''))) {
    await db.from('players').update({ bot_blocked: true }).eq('telegram_id', String(tid))
  }
  return r
}
