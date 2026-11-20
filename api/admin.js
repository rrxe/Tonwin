import crypto from 'node:crypto'
import { db } from '../lib/supabase.js'
import { SCHEMA, GROUPS, getSettings, saveSettings } from '../lib/settings.js'
import { dayKey, round3, notify } from '../lib/game.js'
import { tg } from '../lib/telegram.js'

const bcast = { running: false, total: 0, sent: 0, failed: 0, startedAt: null }

function safeEq(a, b) {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

async function rawSettings() {
  const { data } = await db.from('app_settings').select('key, value')
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]))
}

const ACT = {
  async stats() {
    const today = dayKey()
    const since = new Date(Date.now() - 86400e3).toISOString()
    const q = (t, f) => f(db.from(t).select('*', { count: 'exact', head: true }))
    const [total, newToday, active24, banned, pend, spins, minings] = await Promise.all([
      q('players', (x) => x),
      q('players', (x) => x.gte('created_at', new Date(today + 'T00:00:00Z').toISOString())),
      q('players', (x) => x.gte('last_seen', since)),
      q('players', (x) => x.eq('banned', true)),
      q('withdrawals', (x) => x.eq('status', 'pending')),
      q('players', (x) => x.eq('spins_day', today)),
      q('players', (x) => x.eq('mining_active', true)),
    ])
    const { data: sums } = await db.from('players').select('crystals, ads_watched').limit(100000)
    const circulating = (sums || []).reduce((a, r) => a + Number(r.crystals), 0)
    const ads = (sums || []).reduce((a, r) => a + Number(r.ads_watched), 0)
    const s = await getSettings()
    return {
      players: total.count, newToday: newToday.count, active24: active24.count, banned: banned.count,
      pendingWithdrawals: pend.count, spinnersToday: spins.count, miningNow: minings.count,
      circulating: round3(circulating), circulatingUsd: round3(circulating / s.crystals_per_usd), adsTotal: ads,
    }
  },

  async settings_get() {
    return { schema: SCHEMA, groups: GROUPS, values: await rawSettings() }
  },
  async settings_set({ values }) {
    await saveSettings(values)
    return {}
  },

  /* ---- لاعبين ---- */
  async users_list({ q = '', page = 0 }) {
    let query = db.from('players').select('telegram_id, username, first_name, crystals, total_earned, ads_watched, banned, is_dup, referred_by, created_at, last_seen').order('created_at', { ascending: false }).range(page * 25, page * 25 + 24)
    q = String(q).trim().replace(/[%,()]/g, '')
    if (q) query = /^\d+$/.test(q) ? query.eq('telegram_id', q) : query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%`)
    const { data } = await query
    return { users: data || [] }
  },
  async user_get({ id }) {
    const [p, led, refs] = await Promise.all([
      db.from('players').select('*').eq('telegram_id', String(id)).maybeSingle(),
      db.from('ledger').select('*').eq('telegram_id', String(id)).order('id', { ascending: false }).limit(30),
      db.from('players').select('telegram_id', { count: 'exact', head: true }).eq('referred_by', String(id)),
    ])
    return { player: p.data, ledger: led.data || [], refs: refs.count || 0 }
  },
  async user_ban({ id, banned }) {
    await db.from('players').update({ banned: !!banned }).eq('telegram_id', String(id))
    return {}
  },
  async user_adjust({ id, amount }) {
    const amt = round3(Number(amount))
    if (!Number.isFinite(amt) || amt === 0) throw new Error('مبلغ غير صالح')
    const { data, error } = await db.rpc('add_crystals', { p_tid: String(id), p_delta: amt, p_source: 'admin', p_detail: 'manual', p_ad: false })
    if (error) throw error
    if (data === null) throw new Error('الرصيد غير كافٍ أو اللاعب غير موجود')
    return { balance: Number(data) }
  },
  async user_clear_dup({ id }) {
    await db.from('players').update({ is_dup: false }).eq('telegram_id', String(id))
    return {}
  },

  /* ---- مهام ---- */
  async tasks_list() {
    const { data } = await db.from('tasks').select('*').order('sort').order('id')
    return { tasks: data || [] }
  },
  async task_save({ task }) {
    const t = {
      title: String(task.title || '').slice(0, 120), title_en: String(task.title_en || '').slice(0, 120) || null,
      type: ['link', 'channel', 'ad'].includes(task.type) ? task.type : 'link',
      url: String(task.url || '').slice(0, 300) || null, chat_id: String(task.chat_id || '').slice(0, 80) || null,
      reward: Math.max(0, Number(task.reward) || 0), repeat_daily: !!task.repeat_daily,
      wait_s: Math.max(3, Math.trunc(Number(task.wait_s) || 8)), sort: Math.trunc(Number(task.sort) || 0), active: task.active !== false,
    }
    if (!t.title) throw new Error('العنوان مطلوب')
    const r = task.id ? await db.from('tasks').update(t).eq('id', task.id) : await db.from('tasks').insert(t)
    if (r.error) throw r.error
    return {}
  },
  async task_delete({ id }) {
    await db.from('tasks').delete().eq('id', id)
    return {}
  },

  /* ---- أكواد هدايا ---- */
  async gifts_list() {
    const { data } = await db.from('gift_codes').select('*').order('created_at', { ascending: false }).limit(200)
    return { gifts: data || [] }
  },
  async gift_save({ gift }) {
    const code = String(gift.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40)
    if (!code) throw new Error('الكود مطلوب')
    const row = { code, crystals: Math.max(0, Number(gift.crystals) || 0), max_uses: Math.max(1, Math.trunc(Number(gift.max_uses) || 1)), active: gift.active !== false }
    const { error } = await db.from('gift_codes').upsert(row, { onConflict: 'code' })
    if (error) throw error
    return {}
  },
  async gift_delete({ code }) {
    await db.from('gift_codes').delete().eq('code', String(code))
    return {}
  },

  /* ---- السحوبات ---- */
  async withdrawals_list({ status = 'pending' }) {
    let q = db.from('withdrawals').select('*').order('id', { ascending: false }).limit(100)
    if (status !== 'all') q = q.eq('status', status)
    const { data } = await q
    return { withdrawals: data || [] }
  },
  async withdrawal_set({ id, status, note }) {
    if (!['paid', 'rejected'].includes(status)) throw new Error('حالة غير صالحة')
    const { data: w } = await db.from('withdrawals').update({ status, note: String(note || '').slice(0, 200) || null, processed_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending').select('*').maybeSingle()
    if (!w) throw new Error('الطلب غير موجود أو تمت معالجته')
    if (status === 'rejected') {
      await db.rpc('add_crystals', { p_tid: w.telegram_id, p_delta: Number(w.crystals), p_source: 'withdraw_refund', p_detail: `#${w.id}`, p_ad: false })
      notify(w.telegram_id, `❌ تم رفض طلب السحب #${w.id} وأُعيد الرصيد لحسابك.${w.note ? `\n${w.note}` : ''}`).catch(() => {})
    } else {
      notify(w.telegram_id, `✅ تم دفع طلب السحب #${w.id}\n💵 $${w.usd}`).catch(() => {})
    }
    return {}
  },

  /* ---- بث جماعي ---- */
  async broadcast({ text, onlyActive }) {
    const msg = String(text || '').trim()
    if (!msg) throw new Error('اكتب الرسالة')
    if (bcast.running) throw new Error('فيه بث شغّال حالياً')
    let q = db.from('players').select('telegram_id').eq('bot_blocked', false).eq('banned', false).limit(200000)
    if (onlyActive) q = q.gte('last_seen', new Date(Date.now() - 7 * 86400e3).toISOString())
    const { data } = await q
    const ids = (data || []).map((r) => r.telegram_id)
    Object.assign(bcast, { running: true, total: ids.length, sent: 0, failed: 0, startedAt: Date.now() })
    ;(async () => {
      for (const id of ids) {
        const r = await tg('sendMessage', { chat_id: id, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
        if (r?.ok) bcast.sent++
        else {
          bcast.failed++
          if (r?.error_code === 403) db.from('players').update({ bot_blocked: true }).eq('telegram_id', id).then(() => {}, () => {})
          if (r?.error_code === 429) await new Promise((res) => setTimeout(res, (r.parameters?.retry_after || 2) * 1000))
        }
        await new Promise((res) => setTimeout(res, 45))
      }
      bcast.running = false
    })()
    return { total: ids.length }
  },
  async broadcast_status() {
    return { ...bcast }
  },
}

export default async function handler(req, res) {
  if (!process.env.ADMIN_SECRET || !safeEq(req.headers['x-admin-secret'], process.env.ADMIN_SECRET)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })
  const body = req.body || {}
  const fn = ACT[body.action]
  if (!fn) return res.status(400).json({ ok: false, error: 'unknown_action' })
  try {
    const out = await fn(body)
    return res.json({ ok: true, ...out })
  } catch (e) {
    return res.status(400).json({ ok: false, error: e?.message || 'error' })
  }
}
