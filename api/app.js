import { db } from '../lib/supabase.js'
import { authFromRequest, isMember, appLink } from '../lib/telegram.js'
import { getSettings, blockFor, parseWeights } from '../lib/settings.js'
import {
  dayKey, round3, hashVal, clientIp, miningState, miningBonusPercent,
  pickWeighted, pulseBegin, pulseConsume, earn,
} from '../lib/game.js'

const SLOTS = ['mining_start', 'mining_claim', 'spin', 'daily', 'task']
const taskStarts = new Map() // `${tid}:${taskId}` -> ts

/* ---------------------------- اللاعب ---------------------------- */
async function getOrCreatePlayer(auth, body, req) {
  const tid = String(auth.id)
  const { data: found } = await db.from('players').select('*').eq('telegram_id', tid).maybeSingle()
  if (found) return found

  const deviceHash = hashVal(String(body.device || '').slice(0, 80))
  const ipHash = hashVal(clientIp(req))

  let referredBy = null
  const raw = auth.startParam?.startsWith('ref_') ? auth.startParam.slice(4) : String(body.ref || '').replace(/^ref_/, '')
  if (raw && /^\d{3,20}$/.test(raw) && raw !== tid) {
    const { data: refP } = await db.from('players').select('telegram_id').eq('telegram_id', raw).maybeSingle()
    if (refP) referredBy = raw
  }

  let isDup = false
  if (deviceHash) {
    const { count } = await db.from('players').select('telegram_id', { count: 'exact', head: true }).eq('device_hash', deviceHash)
    isDup = (count || 0) > 0
  }

  const row = {
    telegram_id: tid,
    username: auth.username,
    first_name: auth.firstName,
    photo_url: auth.photoUrl,
    lang: auth.lang && auth.lang.startsWith('ar') ? 'ar' : 'en',
    referred_by: referredBy,
    is_dup: isDup,
    device_hash: deviceHash,
    ip_hash: ipHash,
  }
  await db.from('players').upsert(row, { onConflict: 'telegram_id', ignoreDuplicates: true })
  const { data } = await db.from('players').select('*').eq('telegram_id', tid).single()
  return data
}

/* ---------------------------- الحالة ---------------------------- */
async function buildState(tid, s) {
  const { data: p } = await db.from('players').select('*').eq('telegram_id', tid).single()
  const today = dayKey()

  const [{ count: refTotal }, { count: refQualified }, tasksRes, compRes, wdRes] = await Promise.all([
    db.from('players').select('telegram_id', { count: 'exact', head: true }).eq('referred_by', tid),
    db.from('players').select('telegram_id', { count: 'exact', head: true }).eq('referred_by', tid).eq('ref_paid', true),
    db.from('tasks').select('*').eq('active', true).order('sort').order('id'),
    db.from('task_completions').select('task_id, day_key').eq('telegram_id', tid).in('day_key', [today, 'once']),
    db.from('withdrawals').select('id, crystals, usd, method, status, created_at').eq('telegram_id', tid).order('id', { ascending: false }).limit(10),
  ])

  const bonus = miningBonusPercent(refQualified || 0, s)
  const doneSet = new Set((compRes.data || []).map((c) => c.task_id))
  const spinsUsed = p.spins_day === today ? p.spins_today : 0
  const streakAlive = p.last_daily === dayKey(Date.now() - 86400e3) || p.last_daily === today
  const streak = streakAlive ? p.daily_streak : 0
  const nextStreak = p.last_daily === today ? streak : Math.min(s.daily_max_streak, streak + 1)

  return {
    me: {
      id: tid, name: p.first_name || p.username || 'Player', username: p.username, photo: p.photo_url,
      lang: p.lang, crystals: Number(p.crystals), totalEarned: Number(p.total_earned),
      wallet: p.wallet || '', adsWatched: p.ads_watched,
    },
    mining: miningState(p, s, bonus),
    spin: { used: spinsUsed, limit: s.spin_daily_limit, left: Math.max(0, s.spin_daily_limit - spinsUsed), ad: s.spin_ad && s.require_ads },
    daily: {
      claimed: p.last_daily === today, streak, nextStreak,
      reward: round3(s.daily_base + s.daily_step * (Math.max(1, nextStreak) - 1)),
      maxStreak: s.daily_max_streak, ad: s.daily_ad && s.require_ads,
    },
    refs: { total: refTotal || 0, qualified: refQualified || 0, bonusPercent: bonus },
    tasks: (tasksRes.data || []).map((t) => ({
      id: t.id, title: t.title, titleEn: t.title_en, type: t.type, url: t.url, reward: Number(t.reward),
      daily: t.repeat_daily, wait: t.wait_s, done: doneSet.has(t.id),
    })),
    withdrawals: wdRes.data || [],
  }
}

function publicConfig(s) {
  const blocks = {}
  for (const slot of SLOTS) blocks[slot] = blockFor(s, slot)
  blocks.auto = blockFor(s, 'auto')
  return {
    appName: 'STORMY', usdRate: s.crystals_per_usd, requireAds: s.require_ads, adBlocks: blocks,
    adCooldownS: s.ad_cooldown_s,
    auto: {
      enabled: s.auto_ads_enabled, first: s.auto_first_delay_s, interval: s.auto_interval_s,
      retry: s.auto_retry_s, afterReward: s.auto_after_reward_s,
    },
    spinWeights: parseWeights(s.spin_weights),
    withdraw: { enabled: s.withdraw_enabled, minUsd: s.min_withdraw_usd, methods: [{ id: 'TON', name: 'TON' }] },
    refReward: s.ref_reward, refRequiredAds: s.ref_required_ads, refCommission: s.ref_commission_percent,
    refBonusPerRef: s.ref_mining_bonus_per_ref, refBonusCap: s.ref_mining_bonus_cap,
    shareBase: appLink('ref_'), supportUrl: 'https://t.me/SLYMintX_SUPPORT', channelUrl: s.channel_url, paymentsUrl: 'https://t.me/SLYMintX_payment',
    mandatory: s.mandatory_channel ? { url: s.mandatory_channel_url || `https://t.me/${s.mandatory_channel.replace('@', '')}` } : null,
  }
}

/* ---------------------------- الأكشنز ---------------------------- */
class Fail extends Error {
  constructor(code, status = 400, extra = {}) { super(code); this.code = code; this.status = status; this.extra = extra }
}

const ACTIONS = {
  async boot() { return {} },
  async state() { return {} },

  async set_lang({ p, body }) {
    const lang = body.lang === 'en' ? 'en' : 'ar'
    await db.from('players').update({ lang }).eq('telegram_id', p.telegram_id)
    return {}
  },

  async ad_begin({ p, body, s }) {
    if (!SLOTS.includes(body.slot)) throw new Fail('bad_slot')
    const r = pulseBegin(p.telegram_id, body.slot, s)
    if (!r.ok) throw new Fail('ad_wait', 429, { wait: r.wait })
    return {}
  },

  /* ---- التعدين ---- */
  async mining_start({ p, body, s }) {
    if (p.mining_active) throw new Fail('mining_active')
    if (s.mining_ad_start && s.require_ads) {
      const c = pulseConsume(p.telegram_id, 'mining_start', body.watchedMs, s)
      if (!c.ok) throw new Fail(c.err)
    }
    const { data } = await db.from('players')
      .update({ mining_active: true, mining_started_at: new Date().toISOString(), mining_notified: false })
      .eq('telegram_id', p.telegram_id).eq('mining_active', false).select('telegram_id')
    if (!data?.length) throw new Fail('mining_active')
    if (s.mining_ad_start) await db.rpc('add_crystals', { p_tid: p.telegram_id, p_delta: 0, p_source: 'ad', p_detail: 'mining_start', p_ad: true })
    return {}
  },

  async mining_claim({ p, body, s }) {
    const { count: q } = await db.from('players').select('telegram_id', { count: 'exact', head: true }).eq('referred_by', p.telegram_id).eq('ref_paid', true)
    const m = miningState(p, s, miningBonusPercent(q || 0, s))
    if (!m.active || !m.ready) throw new Fail('not_ready')
    if (s.mining_ad_claim && s.require_ads) {
      const c = pulseConsume(p.telegram_id, 'mining_claim', body.watchedMs, s)
      if (!c.ok) throw new Fail(c.err)
    }
    const { data } = await db.from('players')
      .update({ mining_active: false, mining_started_at: null })
      .eq('telegram_id', p.telegram_id).eq('mining_active', true).select('telegram_id')
    if (!data?.length) throw new Fail('not_ready')
    await earn(p, m.reward, 'mining', s, { detail: `+${m.bonusPercent}%`, ad: s.mining_ad_claim })
    return { reward: m.reward }
  },

  /* ---- العجلة ---- */
  async spin({ p, body, s }) {
    const today = dayKey()
    const used = p.spins_day === today ? p.spins_today : 0
    if (used >= s.spin_daily_limit) throw new Fail('spin_limit')
    if (s.spin_ad && s.require_ads) {
      const c = pulseConsume(p.telegram_id, 'spin', body.watchedMs, s)
      if (!c.ok) throw new Fail(c.err)
    }
    const value = pickWeighted(parseWeights(s.spin_weights))
    const { data: bal, error } = await db.rpc('do_spin', {
      p_tid: p.telegram_id, p_day: today, p_max: s.spin_daily_limit, p_value: value,
    })
    if (error) throw error
    if (bal === null) throw new Fail('spin_limit')
    // عمولة الإحالة وتأهيلها (do_spin منح الرصيد بنفسه)
    earnSideEffects(p, value, s)
    return { value }
  },

  /* ---- المكافأة اليومية ---- */
  async daily_claim({ p, body, s }) {
    const today = dayKey()
    if (p.last_daily === today) throw new Fail('already')
    if (s.daily_ad && s.require_ads) {
      const c = pulseConsume(p.telegram_id, 'daily', body.watchedMs, s)
      if (!c.ok) throw new Fail(c.err)
    }
    const alive = p.last_daily === dayKey(Date.now() - 86400e3)
    const streak = Math.min(s.daily_max_streak, (alive ? p.daily_streak : 0) + 1)
    const { data } = await db.from('players')
      .update({ last_daily: today, daily_streak: streak })
      .eq('telegram_id', p.telegram_id).neq('last_daily', today).select('telegram_id')
    if (!data?.length) {
      // أول مرة last_daily = null (neq ما يطابق null) → نجرّب بالشرط is null
      const r2 = await db.from('players').update({ last_daily: today, daily_streak: streak })
        .eq('telegram_id', p.telegram_id).is('last_daily', null).select('telegram_id')
      if (!r2.data?.length) throw new Fail('already')
    }
    const reward = round3(s.daily_base + s.daily_step * (streak - 1))
    await earn(p, reward, 'daily', s, { detail: `day ${streak}`, ad: s.daily_ad })
    return { reward, streak }
  },

  /* ---- المهام ---- */
  async task_start({ p, body }) {
    taskStarts.set(`${p.telegram_id}:${Number(body.id)}`, Date.now())
    if (taskStarts.size > 50000) taskStarts.clear()
    return {}
  },

  async task_claim({ p, body, s }) {
    const id = Number(body.id)
    const { data: t } = await db.from('tasks').select('*').eq('id', id).eq('active', true).maybeSingle()
    if (!t) throw new Fail('task_missing', 404)
    const dk = t.repeat_daily ? dayKey() : 'once'

    const { data: ex } = await db.from('task_completions').select('task_id').eq('telegram_id', p.telegram_id).eq('task_id', id).eq('day_key', dk).maybeSingle()
    if (ex) throw new Fail('already')

    if (t.type === 'link') {
      const st = taskStarts.get(`${p.telegram_id}:${id}`)
      if (!st || Date.now() - st < Math.max(3, t.wait_s) * 1000 - 800) throw new Fail('task_wait')
    } else if (t.type === 'channel') {
      if (!t.chat_id || !(await isMember(t.chat_id, p.telegram_id))) throw new Fail('not_member')
    } else if (t.type === 'ad') {
      if (s.require_ads) {
        const c = pulseConsume(p.telegram_id, 'task', body.watchedMs, s)
        if (!c.ok) throw new Fail(c.err)
      }
    }

    const { error: insErr } = await db.from('task_completions').insert({ telegram_id: p.telegram_id, task_id: id, day_key: dk })
    if (insErr) {
      if (insErr.code === '23505') throw new Fail('already')
      throw insErr
    }
    try {
      await earn(p, Number(t.reward), 'task', s, { detail: t.title.slice(0, 40), ad: t.type === 'ad' })
    } catch (e) {
      await db.from('task_completions').delete().eq('telegram_id', p.telegram_id).eq('task_id', id).eq('day_key', dk)
      throw e
    }
    return { reward: Number(t.reward) }
  },

  /* ---- الأصدقاء والترتيب ---- */
  async friends({ p }) {
    const [list, ledger] = await Promise.all([
      db.from('players').select('first_name, username, ref_paid, ads_watched, created_at').eq('referred_by', p.telegram_id).order('created_at', { ascending: false }).limit(30),
      db.from('ledger').select('delta').eq('telegram_id', p.telegram_id).in('source', ['referral', 'ref_commission']).limit(5000),
    ])
    const earned = (ledger.data || []).reduce((a, r) => a + Number(r.delta), 0)
    return { friends: (list.data || []).map((f) => ({ name: f.first_name || f.username || '—', paid: f.ref_paid, ads: f.ads_watched })), refEarned: round3(earned) }
  },

  async leaderboard({ p }) {
    const { data } = await db.from('players').select('telegram_id, first_name, username, photo_url, total_earned').eq('banned', false).order('total_earned', { ascending: false }).limit(20)
    const rows = (data || []).map((r, i) => ({
      rank: i + 1, name: r.first_name || r.username || '—', photo: r.photo_url, total: Number(r.total_earned), me: r.telegram_id === p.telegram_id,
    }))
    const { count } = await db.from('players').select('telegram_id', { count: 'exact', head: true }).gt('total_earned', p.total_earned).eq('banned', false)
    return { rows, myRank: (count || 0) + 1 }
  },

  /* ---- المحفظة ---- */
  async withdraw({ p, body, s }) {
    if (!s.withdraw_enabled) throw new Fail('withdraw_off')
    // Withdrawals are TON-only. Do not trust client-provided method settings.
    if (body.method !== 'TON') throw new Fail('bad_method')
    const method = { id: 'TON', name: 'TON' }
    const address = String(body.address || '').trim()
    if (address.length < 6 || address.length > 120 || /\s/.test(address)) throw new Fail('bad_address')
    const crystals = Math.floor(Number(body.crystals) * 1000) / 1000
    if (!Number.isFinite(crystals) || crystals <= 0) throw new Fail('bad_amount')
    const usd = round3(crystals / s.crystals_per_usd)
    if (usd < s.min_withdraw_usd) throw new Fail('below_min', 400, { min: s.min_withdraw_usd })
    if (Number(p.crystals) < crystals) throw new Fail('insufficient')
    const { count: open } = await db.from('withdrawals').select('id', { count: 'exact', head: true }).eq('telegram_id', p.telegram_id).eq('status', 'pending')
    if ((open || 0) >= 3) throw new Fail('too_many_pending')
    const { data: id, error } = await db.rpc('request_withdrawal', {
      p_tid: p.telegram_id, p_crystals: crystals, p_usd: usd, p_method: method.name, p_addr: address, p_username: p.username,
    })
    if (error) throw error
    if (id === null) throw new Fail('insufficient')
    return { id }
  },

  async gift_redeem({ p, body }) {
    const code = String(body.code || '').trim().toUpperCase().slice(0, 40)
    if (!code) throw new Fail('invalid')
    const { data, error } = await db.rpc('redeem_gift', { p_tid: p.telegram_id, p_code: code })
    if (error) throw error
    if (!data?.ok) throw new Fail(data?.err || 'invalid')
    return { amount: Number(data.amount) }
  },
}

// do_spin يمنح الرصيد بنفسه؛ هون بس العمولة/التأهيل
function earnSideEffects(p, value, s) {
  afterSpin(p, value, s).catch((e) => console.error('[afterSpin]', e?.message))
}

async function afterSpin(p, value, s) {
  if (!p.referred_by || p.is_dup) return
  const comm = round3((value * s.ref_commission_percent) / 100)
  if (comm > 0) {
    await db.rpc('add_crystals', { p_tid: p.referred_by, p_delta: comm, p_source: 'ref_commission', p_detail: p.telegram_id, p_ad: false })
  }
  if (!p.ref_paid) {
    const { data: fresh } = await db.from('players').select('ads_watched, ref_paid').eq('telegram_id', p.telegram_id).single()
    if (fresh && !fresh.ref_paid && fresh.ads_watched >= s.ref_required_ads) {
      const { data: won } = await db.from('players').update({ ref_paid: true }).eq('telegram_id', p.telegram_id).eq('ref_paid', false).select('telegram_id')
      if (won?.length && s.ref_reward > 0) {
        await db.rpc('add_crystals', { p_tid: p.referred_by, p_delta: s.ref_reward, p_source: 'referral', p_detail: p.telegram_id, p_ad: false })
      }
    }
  }
}

/* ---------------------------- المعالج ---------------------------- */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })
  const auth = authFromRequest(req)
  if (!auth) return res.status(401).json({ ok: false, error: 'auth' })

  const s = await getSettings()
  const body = req.body || {}
  const action = String(body.action || '')
  const fn = ACTIONS[action]
  if (!fn) return res.status(400).json({ ok: false, error: 'unknown_action' })

  const isAdmin = String(process.env.ADMIN_IDS || '').split(',').map((x) => x.trim()).includes(String(auth.id))
  if (s.maintenance && !isAdmin) return res.status(503).json({ ok: false, error: 'maintenance' })

  const p = await getOrCreatePlayer(auth, body, req)
  if (p.banned) return res.status(403).json({ ok: false, error: 'banned' })

  // اشتراك إجباري
  if (s.mandatory_channel && action !== 'boot' && action !== 'state' && !isAdmin) {
    if (!(await isMember(s.mandatory_channel, p.telegram_id))) {
      return res.status(403).json({ ok: false, error: 'need_sub' })
    }
  }

  // تحديث آخر ظهور + بيانات البروفايل (بدون انتظار)
  db.from('players').update({
    last_seen: new Date().toISOString(), username: auth.username, first_name: auth.firstName,
    photo_url: auth.photoUrl, bot_blocked: false,
  }).eq('telegram_id', p.telegram_id).then(() => {}, () => {})

  try {
    const extra = await fn({ p, body, s, req })
    const out = { ok: true, ...extra }
    if (!['friends', 'leaderboard', 'set_lang'].includes(action)) out.state = await buildState(p.telegram_id, s)
    if (action === 'boot') {
      out.cfg = publicConfig(s)
      out.needSub = s.mandatory_channel ? !(await isMember(s.mandatory_channel, p.telegram_id)) : false
      out.isNew = Date.now() - new Date(p.created_at).getTime() < 60000
    }
    return res.status(200).json(out)
  } catch (e) {
    if (e instanceof Fail) return res.status(e.status).json({ ok: false, error: e.code, ...e.extra })
    console.error(`[api/${action}]`, e?.message || e)
    return res.status(500).json({ ok: false, error: 'server' })
  }
}
