const tg = window.Telegram?.WebApp

function deviceId() {
  try {
    let d = localStorage.getItem('cr_dev')
    if (!d) {
      d = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36))
      localStorage.setItem('cr_dev', d)
    }
    return d
  } catch {
    return ''
  }
}

const urlRef = new URLSearchParams(location.search).get('ref') || ''

export class ApiError extends Error {
  constructor(code, data) {
    super(code)
    this.code = code
    this.data = data || {}
  }
}

export async function api(action, body = {}) {
  let res
  try {
    res = await fetch('/api/app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `tga ${tg?.initData || ''}` },
      body: JSON.stringify({ action, device: deviceId(), ref: urlRef, ...body }),
    })
  } catch {
    throw new ApiError('network')
  }
  const j = await res.json().catch(() => null)
  if (!j?.ok) throw new ApiError(j?.error || 'server', j || {})
  return j
}

export const haptic = (t = 'light') => {
  try { tg?.HapticFeedback?.impactOccurred(t) } catch {}
}
export const hapticOk = () => {
  try { tg?.HapticFeedback?.notificationOccurred('success') } catch {}
}
