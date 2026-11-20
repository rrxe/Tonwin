import { db } from './supabase.js'

// كل إعدادات التطبيق هنا. اللوحة تبني الفورم تلقائياً من هالقائمة.
// t: num | int | bool | text | area | blockid
export const SCHEMA = [
  // ---- عام
  { k: 'app_name', g: 'general', t: 'text', d: 'STORMY', l: 'اسم التطبيق' },
  { k: 'maintenance', g: 'general', t: 'bool', d: false, l: 'وضع الصيانة (يوقف التطبيق للمستخدمين)' },
  { k: 'support_url', g: 'general', t: 'text', d: 'https://t.me/SLYMintX_SUPPORT', l: 'رابط الدعم' },
  { k: 'channel_url', g: 'general', t: 'text', d: '', l: 'رابط قناة الأخبار (اختياري)' },
  // ---- الاقتصاد
  { k: 'crystals_per_usd', g: 'economy', t: 'num', d: 1000, l: 'كم كريستال = 1$' },
  // ---- التعدين
  { k: 'mining_reward', g: 'mining', t: 'num', d: 2.5, l: 'مكافأة التعدين (كريستال)' },
  { k: 'mining_cycle_hours', g: 'mining', t: 'num', d: 2, l: 'مدة دورة التعدين (ساعات)' },
  { k: 'mining_ad_start', g: 'mining', t: 'bool', d: true, l: 'إعلان عند بدء التعدين' },
  { k: 'mining_ad_claim', g: 'mining', t: 'bool', d: true, l: 'إعلان عند استلام التعدين' },
  { k: 'ref_mining_bonus_per_ref', g: 'mining', t: 'num', d: 1, l: 'بونص التعدين % لكل إحالة مؤهلة' },
  { k: 'ref_mining_bonus_cap', g: 'mining', t: 'num', d: 50, l: 'أقصى بونص تعدين %' },
  // ---- العجلة
  { k: 'spin_daily_limit', g: 'spin', t: 'int', d: 5, l: 'عدد اللفات اليومية' },
  { k: 'spin_ad', g: 'spin', t: 'bool', d: true, l: 'إعلان مطلوب لكل لفة' },
  { k: 'spin_weights', g: 'spin', t: 'area', d: '300,220,160,120,90,65,48,35,26,19,14,10,7,5,3', l: 'أوزان الاحتمال للأرقام 1 إلى 15 (15 رقم مفصولة بفاصلة — الرقم الأكبر يعني احتمال أعلى)' },
  // ---- اليومي
  { k: 'daily_base', g: 'daily', t: 'num', d: 2, l: 'المكافأة اليومية الأساسية' },
  { k: 'daily_step', g: 'daily', t: 'num', d: 0.5, l: 'زيادة لكل يوم متتالي' },
  { k: 'daily_max_streak', g: 'daily', t: 'int', d: 7, l: 'أقصى عدد أيام متتالية' },
  { k: 'daily_ad', g: 'daily', t: 'bool', d: true, l: 'إعلان مطلوب للمكافأة اليومية' },
  // ---- الإحالات
  { k: 'ref_reward', g: 'referral', t: 'num', d: 25, l: 'مكافأة الإحالة (كريستال)' },
  { k: 'ref_required_ads', g: 'referral', t: 'int', d: 5, l: 'عدد الإعلانات اللي لازم يشوفها المُحال حتى تنحسب الإحالة' },
  { k: 'ref_commission_percent', g: 'referral', t: 'num', d: 10, l: 'نسبة العمولة % من أرباح المُحال' },
  // ---- السحب
  { k: 'withdraw_enabled', g: 'withdraw', t: 'bool', d: true, l: 'تفعيل السحب' },
  { k: 'min_withdraw_usd', g: 'withdraw', t: 'num', d: 5, l: 'أقل مبلغ سحب ($)' },
  // ---- الإعلانات (كلها int)
  { k: 'require_ads', g: 'ads', t: 'bool', d: true, l: 'اشتراط الإعلانات للمكافآت (طفّيه للتجربة فقط!)' },
  { k: 'ad_cooldown_s', g: 'ads', t: 'int', d: 15, l: 'فاصل بين إعلانات المكافآت (ثانية)' },
  { k: 'ad_block_default', g: 'ads', t: 'blockid', d: '', l: 'بلوك ID الافتراضي (int) — يُستخدم لأي مكان ما إله بلوك خاص' },
  { k: 'ad_block_mining_start', g: 'ads', t: 'blockid', d: '', l: 'بلوك بدء التعدين' },
  { k: 'ad_block_mining_claim', g: 'ads', t: 'blockid', d: '', l: 'بلوك استلام التعدين' },
  { k: 'ad_block_spin', g: 'ads', t: 'blockid', d: '', l: 'بلوك العجلة' },
  { k: 'ad_block_daily', g: 'ads', t: 'blockid', d: '', l: 'بلوك المكافأة اليومية' },
  { k: 'ad_block_task', g: 'ads', t: 'blockid', d: '', l: 'بلوك مهام الإعلانات' },
  // ---- الإعلانات التلقائية
  { k: 'auto_ads_enabled', g: 'auto', t: 'bool', d: true, l: 'تفعيل الإعلانات التلقائية' },
  { k: 'ad_block_auto', g: 'auto', t: 'blockid', d: '', l: 'بلوك الإعلان التلقائي (int)' },
  { k: 'auto_first_delay_s', g: 'auto', t: 'int', d: 25, l: 'أول إعلان تلقائي بعد (ثانية)' },
  { k: 'auto_interval_s', g: 'auto', t: 'int', d: 90, l: 'كل كم ثانية يتكرر الإعلان التلقائي' },
  { k: 'auto_retry_s', g: 'auto', t: 'int', d: 30, l: 'إعادة المحاولة عند الفشل (ثانية)' },
  { k: 'auto_after_reward_s', g: 'auto', t: 'int', d: 10, l: 'إعلان تلقائي بعد إعلان المكافأة بـ (ثانية، 0 = معطل)' },
  // ---- الاشتراك الإجباري
  { k: 'mandatory_channel', g: 'channel', t: 'text', d: '', l: 'قناة الاشتراك الإجباري (مثال: @mychannel) — فاضي = معطل. لازم البوت أدمن فيها' },
  { k: 'mandatory_channel_url', g: 'channel', t: 'text', d: '', l: 'رابط القناة (https://t.me/...)' },
]

export const GROUPS = {
  general: 'عام', economy: 'الاقتصاد', mining: 'التعدين ⛏️', spin: 'العجلة 🎡', daily: 'المكافأة اليومية',
  referral: 'الإحالات 👥', withdraw: 'السحب 💸', ads: 'الإعلانات 📺', auto: 'الإعلانات التلقائية ⚡', channel: 'الاشتراك الإجباري',
}

let cache = null
let cacheAt = 0

export function invalidateSettings() {
  cache = null
}

function coerce(def, raw) {
  if (raw === undefined || raw === null || raw === '') return def.d
  if (def.t === 'bool') return raw === true || raw === 'true' || raw === '1'
  if (def.t === 'num') { const n = Number(raw); return Number.isFinite(n) ? n : def.d }
  if (def.t === 'int') { const n = Math.trunc(Number(raw)); return Number.isFinite(n) ? n : def.d }
  if (def.t === 'blockid') { const n = String(raw).replace(/\D/g, ''); return n }
  return String(raw)
}

export async function getSettings() {
  if (cache && Date.now() - cacheAt < 15000) return cache
  const { data, error } = await db.from('app_settings').select('key, value')
  if (error) throw error
  const raw = Object.fromEntries((data || []).map((r) => [r.key, r.value]))
  const out = {}
  for (const def of SCHEMA) out[def.k] = coerce(def, raw[def.k])
  out.app_name = 'STORMY'
  out.support_url = 'https://t.me/SLYMintX_SUPPORT'
  out.crystals_per_usd = Math.max(1, out.crystals_per_usd)
  out.mining_cycle_hours = Math.max(0.01, out.mining_cycle_hours)
  cache = out
  cacheAt = Date.now()
  return out
}

/** قيمة بلوك الإعلان (int) لمكان معين، مع fallback للافتراضي */
export function blockFor(s, slot) {
  const v = s[`ad_block_${slot}`] || s.ad_block_default || ''
  return v ? Number(v) : null
}

export function parseWeights(text) {
  const arr = String(text || '').split(/[,\s]+/).filter(Boolean).map(Number)
  if (arr.length !== 15 || arr.some((n) => !Number.isFinite(n) || n < 0) || arr.every((n) => n === 0)) {
    return '300,220,160,120,90,65,48,35,26,19,14,10,7,5,3'.split(',').map(Number)
  }
  return arr
}

export function parseMethods(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [id, ...rest] = l.split('|')
      return { id: id.trim(), name: (rest.join('|') || id).trim() }
    })
}

export async function saveSettings(map) {
  const known = new Set(SCHEMA.map((d) => d.k))
  const rows = []
  for (const [k, v] of Object.entries(map || {})) {
    if (!known.has(k)) continue
    const def = SCHEMA.find((d) => d.k === k)
    let val = v
    if (def.t === 'blockid') val = String(v ?? '').replace(/\D/g, '')
    if (def.t === 'bool') val = v === true || v === 'true' ? 'true' : 'false'
    if (def.k === 'spin_weights' && parseWeights(val).join(',') !== String(val).split(/[,\s]+/).filter(Boolean).map(Number).join(',')) {
      throw new Error('أوزان العجلة لازم تكون 15 رقم موجب مفصولة بفاصلة')
    }
    rows.push({ key: k, value: String(val ?? '') })
  }
  if (rows.length) {
    const { error } = await db.from('app_settings').upsert(rows, { onConflict: 'key' })
    if (error) throw error
  }
  invalidateSettings()
}
