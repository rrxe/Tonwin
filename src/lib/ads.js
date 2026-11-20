// إعلانات Adsgram (كلها int). بلوك ID ييجي من لوحة الأدمن.
import { api } from './api.js'

let cfgRef = null
export const setAdConfig = (c) => { cfgRef = c }

let lock = false
let lastManualEnd = 0
const controllers = new Map()

export class AdError extends Error {
  constructor(code, extra) { super(code); this.code = code; this.extra = extra }
}

function controller(blockId) {
  const key = `int-${blockId}`
  if (controllers.has(key)) return controllers.get(key)
  const A = window.Adsgram
  if (!A?.init) return null
  const c = A.init({ blockId: key })
  controllers.set(key, c)
  return c
}

export const adsLocked = () => lock

/**
 * إعلان مكافأة: begin على السيرفر ← عرض الإعلان ← نرجع مدة المشاهدة.
 * (السيرفر يتحقق من الوقت بنفسه عند منح المكافأة)
 */
export async function watchRewardAd(slot) {
  const cfg = cfgRef
  if (!cfg?.requireAds) return { watchedMs: 99999 }
  const blockId = cfg.adBlocks?.[slot]
  if (!blockId) throw new AdError('no_block')
  if (lock) throw new AdError('busy')
  const gap = (cfg.adCooldownS || 15) * 1000
  const wait = Math.ceil((gap - (Date.now() - lastManualEnd)) / 1000)
  if (lastManualEnd && wait > 0) throw new AdError('wait', wait)
  const c = controller(blockId)
  if (!c) throw new AdError('not_ready')

  lock = true
  try {
    try {
      await api('ad_begin', { slot })
    } catch (e) {
      if (e.code === 'ad_wait') throw new AdError('wait', e.data?.wait || 5)
      throw e
    }
    const t0 = Date.now()
    let startedAt = 0
    const onStart = () => { startedAt = Date.now() }
    c.addEventListener?.('onStart', onStart)
    let result
    try {
      result = await c.show()
    } catch (err) {
      // Adsgram يرمي كائن { error, done, state, description }
      if (err?.state === 'load' || /no ?fill|not ?found|no_banner/i.test(String(err?.description || ''))) throw new AdError('no_fill')
      throw new AdError(err?.done === false && startedAt ? 'too_short' : 'no_fill')
    } finally {
      c.removeEventListener?.('onStart', onStart)
    }
    const watchedMs = Date.now() - (startedAt || t0)
    if (result?.error) throw new AdError('no_fill')
    if (watchedMs < 4800) throw new AdError('too_short')
    return { watchedMs }
  } finally {
    lock = false
    lastManualEnd = Date.now()
    window.dispatchEvent(new CustomEvent('cr:reward-ad-end'))
  }
}

/* ------------------------- إعلان تلقائي ------------------------- */
export async function showAutoAd() {
  const cfg = cfgRef
  const blockId = cfg?.adBlocks?.auto
  if (!blockId || lock) return false
  if (document.visibilityState !== 'visible') return false
  const c = controller(blockId)
  if (!c) return false
  lock = true
  try {
    await c.show()
    return true
  } catch {
    return false
  } finally {
    lock = false
  }
}
