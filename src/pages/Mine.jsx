import React, { useState } from 'react'
import { Embers, BlurText } from '../fx.jsx'
import { Gem, Icon, Shards, fmt, hms, useNow } from '../ui.jsx'
import { haptic, hapticOk } from '../lib/api.js'

const R = 118
const C = 2 * Math.PI * R
const SUPPORT_URL = 'https://t.me/SLYMintX_SUPPORT'

function openSupport() {
  const tg = window.Telegram?.WebApp
  try {
    if (tg?.openTelegramLink) tg.openTelegramLink(SUPPORT_URL)
    else window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')
  } catch { window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer') }
}

export default function Mine({ ctx }) {
  const { state, t, gated, toast, setPage, lang } = ctx
  const m = state.mining
  const d = state.daily
  const now = useNow(1000)
  const [busy, setBusy] = useState(false)
  const [burst, setBurst] = useState(0)

  const started = m.startedAt ? new Date(m.startedAt).getTime() : 0
  const readyAt = m.readyAt ? new Date(m.readyAt).getTime() : 0
  const ready = m.active && now >= readyAt
  const progress = m.active ? Math.min(1, (now - started) / m.cycleMs) : 0
  const mode = !m.active ? 'idle' : ready ? 'ready' : 'mining'

  async function onMain() {
    if (busy) return
    if (mode === 'mining') return
    setBusy(true)
    haptic('medium')
    try {
      if (mode === 'idle') {
        await gated('mining_start', m.adStart, 'mining_start')
        toast(t('mine_started'), 'ok')
      } else {
        const j = await gated('mining_claim', m.adClaim, 'mining_claim')
        setBurst(Date.now())
        hapticOk()
        toast(`+${fmt(j.reward)} 💎`, 'ok')
      }
    } catch (e) {
      ctx.fail(e)
    } finally {
      setBusy(false)
    }
  }

  async function onDaily() {
    if (busy || d.claimed) return
    setBusy(true)
    try {
      const j = await gated('daily', d.ad, 'daily_claim')
      setBurst(Date.now())
      hapticOk()
      toast(`+${fmt(j.reward)} 💎`, 'ok')
    } catch (e) {
      ctx.fail(e)
    } finally {
      setBusy(false)
    }
  }

  const label =
    mode === 'idle' ? t('mine_ignite') : mode === 'ready' ? t('mine_collect') : hms(readyAt - now)

  return (
    <div className="page">
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="welcome-kicker">STORMY EARN</span>
          <h1>{lang === 'ar' ? 'ابدأ بجمع أرباحك' : 'Start earning today'}</h1>
          <p>{lang === 'ar' ? 'اجمع النقاط، أكمل المهام، واطلب السحب بسهولة.' : 'Collect points, complete tasks, and request withdrawals with ease.'}</p>
        </div>
        <div className="welcome-art" aria-hidden="true"><span className="art-orbit" /><span className="art-core"><Gem size={56} tone="ice" /></span></div>
        <div className="welcome-actions">
          <button className="welcome-action primary" onClick={() => setPage('wallet')}><Icon name="wallet" size={17} /><span>{lang === 'ar' ? 'السحب والمحفظة' : 'Wallet & withdraw'}</span></button>
          <button className="welcome-action" onClick={openSupport}><Icon name="tg" size={17} /><span>{lang === 'ar' ? 'تواصل مع الدعم' : 'Contact support'}</span></button>
        </div>
      </section>
      <Shards run={burst} />

      <section className={`reactor ${mode}`}>
        <div className="reactor-glow" />
        <div className="reactor-sonar" aria-hidden="true"><i /><i /><i /></div>
        {mode === 'ready' && <><div className="reactor-rays" aria-hidden="true" /><Embers /></>}
        <svg className="reactor-svg" viewBox="0 0 300 300">
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#26765C" />
              <stop offset=".5" stopColor="#69B98C" />
              <stop offset="1" stopColor="#D6F58C" />
            </linearGradient>
          </defs>
          <circle className="ring-spin slow" cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" strokeDasharray="2 10" />
          <circle className="ring-spin rev" cx="150" cy="150" r="130" fill="none" stroke="rgba(38,118,92,.32)" strokeWidth="1" strokeDasharray="30 14 4 14" />
          <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
          <circle
            cx="150" cy="150" r={R} fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - (mode === 'ready' ? 1 : progress))}
            transform="rotate(-90 150 150)" className="ring-prog"
          />
        </svg>
        <div className="orbit o1"><Gem size={20} tone="steel" shine={false} /></div>
        <div className="orbit o2"><Gem size={16} tone="ice" shine={false} /></div>
        <div className="orbit o3"><Gem size={14} tone="ice" shine={false} /></div>
        <div className="reactor-core">
          <Gem size={132} tone={mode === 'ready' ? 'ice' : 'steel'} />
        </div>
        <div className="reactor-rate">
          <Icon name="fire" size={14} /> {t('mine_rate', { n: fmt(m.reward), h: fmt(m.cycleMs / 3600e3) })}
          {m.bonusPercent > 0 && <b className="bonus"> +{fmt(m.bonusPercent)}%</b>}
        </div>
      </section>

      <button className={`btn big ${mode}`} onClick={onMain} disabled={busy || mode === 'mining'}>
        {mode !== 'mining' && (mode === 'idle' ? m.adStart : m.adClaim) && <Icon name="ad" size={20} />}
        <span className={mode === 'mining' ? 'mono' : ''}>{label}</span>
      </button>
      <p className="hint center">
        {mode === 'idle' && t('mine_hint_idle')}
        {mode === 'mining' && t('mine_hint_mining')}
        {mode === 'ready' && t('mine_hint_ready')}
      </p>

      <section className="glass prism">
        <div className="prism-head">
          <div>
            <h3><BlurText text={t('daily_title')} /></h3>
            <p className="hint">{d.claimed ? t('daily_done') : t('daily_sub')}</p>
          </div>
          <button className="btn small" disabled={busy || d.claimed} onClick={onDaily}>
            {d.claimed ? <Icon name="check" size={18} /> : d.ad ? <Icon name="ad" size={18} /> : null}
            <span>{d.claimed ? t('claimed') : `+${fmt(d.reward)}`}</span>
          </button>
        </div>
        <div className="streak">
          {Array.from({ length: d.maxStreak }, (_, i) => {
            const day = i + 1
            const on = day <= d.streak
            return (
              <div key={day} className={`dot ${on ? 'on' : ''} ${day === d.nextStreak && !d.claimed ? 'next' : ''}`}>
                <Gem size={22} tone={on ? 'steel' : 'deep'} shine={false} />
                <span>{day}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
