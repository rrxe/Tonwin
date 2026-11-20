import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gem, Icon, CountUp, fmt } from './ui.jsx'
import { Particles, AmbientSpotlight, ClickSpark, ShinyText, useCardFx } from './fx.jsx'
import { api, ApiError, haptic } from './lib/api.js'
import { watchRewardAd, showAutoAd, setAdConfig, AdError } from './lib/ads.js'
import { makeT } from './i18n.js'
import Mine from './pages/Mine.jsx'
import Spin from './pages/Spin.jsx'
import Tasks from './pages/Tasks.jsx'
import Friends from './pages/Friends.jsx'
import Wallet from './pages/Wallet.jsx'

const tg = window.Telegram?.WebApp
const SUPPORT_URL = 'https://t.me/SLYMintX_SUPPORT'

function openSupport() {
  try {
    if (tg?.openTelegramLink) tg.openTelegramLink(SUPPORT_URL)
    else window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')
  } catch { window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer') }
}
const NAV = [
  ['mine', 'mine', 'nav_mine'],
  ['spin', 'wheel', 'nav_spin'],
  ['tasks', 'tasks', 'nav_tasks'],
  ['friends', 'friends', 'nav_friends'],
  ['wallet', 'wallet', 'nav_wallet'],
]

export default function App() {
  const [cfg, setCfg] = useState(null)
  const [state, setState] = useState(null)
  const [page, setPage] = useState('mine')
  const [lang, setLang] = useState(() => localStorage.getItem('cr_lang') || ((tg?.initDataUnsafe?.user?.language_code || '').startsWith('ar') ? 'ar' : 'en'))
  const [fatal, setFatal] = useState(null)
  const [needSub, setNeedSub] = useState(false)
  const [toastObj, setToastObj] = useState(null)
  const t = useMemo(() => makeT(lang), [lang])
  const toastTimer = useRef(0)
  useCardFx()

  useEffect(() => {
    document.title = 'STORMY'
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const toast = useCallback((msg, kind = 'info') => {
    clearTimeout(toastTimer.current)
    setToastObj({ msg, kind, id: Date.now() })
    toastTimer.current = setTimeout(() => setToastObj(null), 2600)
  }, [])

  const boot = useCallback(async () => {
    try {
      const j = await api('boot')
      setCfg({ ...j.cfg, appName: 'STORMY', supportUrl: SUPPORT_URL })
      setAdConfig(j.cfg)
      setState(j.state)
      setNeedSub(!!j.needSub)
      if (!localStorage.getItem('cr_lang') && j.state?.me?.lang) setLang(j.state.me.lang)
      setFatal(null)
    } catch (e) {
      setFatal(e.code || 'server')
    }
  }, [])

  useEffect(() => { boot() }, [boot])

  // تحديث الحالة دورياً (رصيد/تعدين) كل دقيقة والتطبيق ظاهر
  useEffect(() => {
    if (!state) return
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') api('state').then((j) => setState(j.state)).catch(() => {})
    }, 60000)
    return () => clearInterval(iv)
  }, [!!state])

  const fail = useCallback((e) => {
    if (e instanceof AdError) {
      const key = { no_block: 'e_no_block', busy: 'e_busy', wait: 'e_wait', not_ready: 'e_not_ready', no_fill: 'e_no_fill', too_short: 'e_too_short' }[e.code] || 'e_generic'
      toast(t(key, { n: e.extra }), 'bad')
      return
    }
    if (e instanceof ApiError) {
      if (e.code === 'need_sub') { setNeedSub(true); return }
      if (e.code === 'maintenance' || e.code === 'banned' || e.code === 'auth') { setFatal(e.code); return }
      const k = `e_${e.code}`
      toast(t(k, { n: e.data?.wait ?? e.data?.min }) === k ? t('e_generic') : t(k, { n: e.data?.wait ?? e.data?.min }), 'bad')
      return
    }
    toast(t('e_generic'), 'bad')
  }, [t, toast])

  /** تنفيذ أكشن مكافأة: (إعلان إذا مطلوب) ثم الطلب للسيرفر */
  const gated = useCallback(async (slot, needAd, action, body = {}, opts = {}) => {
    let watchedMs = 0
    if (needAd) watchedMs = (await watchRewardAd(slot)).watchedMs
    const j = await api(action, { ...body, watchedMs })
    if (!opts.defer) setState(j.state)
    return j
  }, [])

  // الإعلانات التلقائية
  useEffect(() => {
    if (!cfg?.auto?.enabled || !cfg.adBlocks?.auto || needSub || fatal) return
    let timer = 0
    let dead = false
    const schedule = (sec) => {
      clearTimeout(timer)
      timer = setTimeout(run, Math.max(3, sec) * 1000)
    }
    const run = async () => {
      if (dead) return
      const ok = await showAutoAd()
      schedule(ok ? cfg.auto.interval : cfg.auto.retry)
    }
    const onEnd = () => { if (cfg.auto.afterReward > 0) schedule(cfg.auto.afterReward) }
    schedule(cfg.auto.first)
    window.addEventListener('cr:reward-ad-end', onEnd)
    return () => { dead = true; clearTimeout(timer); window.removeEventListener('cr:reward-ad-end', onEnd) }
  }, [cfg, needSub, fatal])

  function switchLang() {
    const n = lang === 'ar' ? 'en' : 'ar'
    setLang(n)
    localStorage.setItem('cr_lang', n)
    api('set_lang', { lang: n }).catch(() => {})
  }

  if (fatal) return <Screen t={t} kind={fatal} onRetry={boot} />
  if (!state || !cfg) return <Splash />
  if (needSub) return <Gate t={t} cfg={cfg} onDone={boot} />

  const ctx = { state, cfg, t, lang, gated, fail, toast, setState, setPage, page }
  const Page = { mine: Mine, spin: Spin, tasks: Tasks, friends: Friends, wallet: Wallet }[page]

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Particles />

      <header className="top">
        <div className="who">
          <span className="av">{state.me.photo ? <img src={state.me.photo} alt="" referrerPolicy="no-referrer" /> : state.me.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <small><ShinyText text="STORMY" /></small>
            <b>{state.me.name}</b>
          </div>
        </div>
        <div className="top-r">
          <button className="support-top" onClick={openSupport}><Icon name="tg" size={15} /><span>{t('support')}</span></button>
          <button className="chip-btn" onClick={switchLang} aria-label="language"><Icon name="globe" size={16} /> {lang === 'ar' ? 'EN' : 'ع'}</button>
          <button className="bal" onClick={() => setPage('wallet')}>
            <Gem size={20} tone="steel" />
            <span><CountUp value={state.me.crystals} /></span>
          </button>
        </div>
      </header>

      <main key={page} className="view">
        <Page ctx={ctx} />
      </main>

      <nav className="dock glass">
        <span className="dock-pill" style={{ '--i': NAV.findIndex((n) => n[0] === page) }} />
        {NAV.map(([k, ic, lbl]) => (
          <button key={k} className={page === k ? 'on' : ''} onClick={() => { haptic(); setPage(k) }}>
            <span className="ic"><Icon name={ic} size={22} /></span>
            <small>{t(lbl)}</small>
          </button>
        ))}
      </nav>

      <AmbientSpotlight />
      <ClickSpark />
      {toastObj && <div key={toastObj.id} className={`toast ${toastObj.kind}`}>{toastObj.msg}</div>}
    </div>
  )
}

function Splash() {
  return (
    <div className="splash">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Particles count={26} />
      <div className="splash-grid" aria-hidden="true" />
      <div className="splash-mark">
        <span className="ring r1" />
        <span className="ring r2" />
        <Gem size={110} tone="steel" />
      </div>
      <div className="splash-name"><ShinyText text="STORMY" speed={2.6} /></div>
      <div className="splash-bar"><i /></div>
    </div>
  )
}

function Screen({ t, kind, onRetry }) {
  const tgOnly = !tg?.initData
  const msg = tgOnly && kind === 'auth' ? t('s_open_tg') : t(`s_${kind}`) === `s_${kind}` ? t('s_error') : t(`s_${kind}`)
  return (
    <div className="splash">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Gem size={90} tone="deep" shine={false} />
      <p className="screen-msg">{msg}</p>
      {kind !== 'banned' && <button className="btn" onClick={onRetry}>{t('retry')}</button>}
    </div>
  )
}

function Gate({ t, cfg, onDone }) {
  const open = () => {
    try { tg?.openTelegramLink ? tg.openTelegramLink(cfg.mandatory.url) : window.open(cfg.mandatory.url, '_blank') } catch {}
  }
  return (
    <div className="splash">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Icon name="lock" size={42} />
      <p className="screen-msg">{t('gate_msg')}</p>
      <button className="btn" onClick={open}><Icon name="tg" size={18} /> <span>{t('join')}</span></button>
      <button className="btn ghost" onClick={onDone}>{t('gate_done')}</button>
    </div>
  )
}
