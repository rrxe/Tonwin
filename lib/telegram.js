import crypto from 'node:crypto'

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN

/** يتحقق من initData القادمة من Telegram Mini App (HMAC). */
export function verifyInitData(initData) {
  if (!initData || !TOKEN()) return null
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null
    params.delete('hash')
    const check = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n')
    const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN()).digest()
    const calc = crypto.createHmac('sha256', secret).update(check).digest('hex')
    if (calc !== hash) return null
    const authDate = Number(params.get('auth_date') || 0)
    if (authDate && Date.now() / 1000 - authDate > 86400) return null
    const user = JSON.parse(params.get('user') || 'null')
    if (!user?.id) return null
    return {
      id: user.id,
      username: user.username || null,
      firstName: user.first_name || null,
      photoUrl: user.photo_url || null,
      lang: user.language_code || null,
      startParam: params.get('start_param') || null,
    }
  } catch {
    return null
  }
}

export function authFromRequest(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('tga ') ? verifyInitData(h.slice(4)) : null
}

export async function tg(method, body) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 10000)
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    return await r.json().catch(() => null)
  } catch (e) {
    return { ok: false, description: e?.message }
  } finally {
    clearTimeout(t)
  }
}

const memberCache = new Map()
/** هل المستخدم عضو في القناة/المجموعة؟ (كاش 60 ثانية) */
export async function isMember(chatId, userId) {
  const key = `${chatId}:${userId}`
  const hit = memberCache.get(key)
  if (hit && Date.now() - hit.at < 60000) return hit.ok
  const r = await tg('getChatMember', { chat_id: chatId, user_id: Number(userId) })
  const ok = !!r?.ok && ['creator', 'administrator', 'member', 'restricted'].includes(r.result?.status)
  memberCache.set(key, { ok, at: Date.now() })
  if (memberCache.size > 20000) memberCache.clear()
  return ok
}

export const esc = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function appLink(startParam) {
  const bot = process.env.BOT_USERNAME || ''
  const app = process.env.MINI_APP_SHORT_NAME || ''
  if (app) {
    const base = `https://t.me/${bot}/${app}`
    return startParam ? `${base}?startapp=${encodeURIComponent(startParam)}` : base
  }
  return startParam
    ? `https://t.me/${bot}?start=${encodeURIComponent(startParam)}`
    : `https://t.me/${bot}`
}
