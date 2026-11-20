import React, { useState } from 'react'
import { Gem, Icon, fmt } from '../ui.jsx'
import { api, hapticOk } from '../lib/api.js'

const tg = window.Telegram?.WebApp
const SUPPORT_URL = 'https://t.me/SLYMintX_SUPPORT'
const PAYMENT_CHANNEL_URL = 'https://t.me/SLYMintX_payment'
const open = (u) => {
  if (!u) return
  try { /t\.me\//.test(u) && tg?.openTelegramLink ? tg.openTelegramLink(u) : tg?.openLink ? tg.openLink(u) : window.open(u, '_blank') } catch { window.open(u, '_blank') }
}

export default function Wallet({ ctx }) {
  const { state, cfg, t, toast } = ctx
  const w = cfg.withdraw
  const bal = state.me.crystals
  const usd = bal / cfg.usdRate
  const minC = w.minUsd * cfg.usdRate
  const pct = Math.min(100, (bal / minC) * 100)

  const [channelNoticeOpen, setChannelNoticeOpen] = useState(false)
  const [withdrawFormOpen, setWithdrawFormOpen] = useState(false)
  const [addr, setAddr] = useState(state.me.wallet || '')
  const [amount, setAmount] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const amt = Number(amount)
  const amtUsd = Number.isFinite(amt) ? amt / cfg.usdRate : 0

  async function submit() {
    if (busy) return
    setBusy(true)
    try {
      const j = await api('withdraw', { method: 'TON', address: addr.trim(), crystals: amt })
      ctx.setState(j.state)
      setAmount('')
      setWithdrawFormOpen(false)
      hapticOk()
      toast(t('wd_sent'), 'ok')
    } catch (e) { ctx.fail(e) } finally { setBusy(false) }
  }

  async function redeem() {
    if (busy || !code.trim()) return
    setBusy(true)
    try {
      const j = await api('gift_redeem', { code })
      ctx.setState(j.state)
      setCode('')
      hapticOk()
      toast(`+${fmt(j.amount)} 💎`, 'ok')
    } catch (e) { ctx.fail(e) } finally { setBusy(false) }
  }

  return (
    <>
      {channelNoticeOpen && (
        <div className="withdraw-notice-backdrop" role="presentation" onClick={() => setChannelNoticeOpen(false)}>
          <section className="withdraw-notice-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-notice-title" onClick={(e) => e.stopPropagation()}>
            <div className="withdraw-notice-topline">
              <span>STORMY / PAYMENTS</span>
              <button type="button" className="withdraw-notice-close" onClick={() => setChannelNoticeOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="withdraw-notice-emblem"><Icon name="tg" size={31} /></div>
            <div className="withdraw-notice-copy">
              <p className="withdraw-notice-kicker">{t('wd_channel_kicker')}</p>
              <h2 id="withdraw-notice-title">{t('wd_channel_title')}</h2>
              <p>{t('wd_channel_desc')}</p>
            </div>
            <button type="button" className="withdraw-notice-channel" onClick={() => open(PAYMENT_CHANNEL_URL)}>
              <span className="withdraw-notice-channel-icon"><Icon name="tg" size={20} /></span>
              <span><strong>STORMY Payment</strong><small>@SLYMintX_payment</small></span>
              <b>↗</b>
            </button>
            <div className="withdraw-notice-actions">
              <button type="button" className="btn big" onClick={() => open(PAYMENT_CHANNEL_URL)}>{t('wd_channel_open')}</button>
              <button type="button" className="btn ghost big" onClick={() => { setChannelNoticeOpen(false); setWithdrawFormOpen(true) }}>{t('wd_channel_continue')}</button>
            </div>
          </section>
        </div>
      )}
      <div className="page">
      <section className="glass vault">
        <div className="vault-gem"><Gem size={84} tone="steel" /></div>
        <div className="vault-n">{fmt(bal)} <small>💎</small></div>
        <div className="vault-usd">≈ ${fmt(usd, 3)}</div>
        <div className="meter"><i style={{ width: `${pct}%` }} /></div>
        <p className="hint center">{bal >= minC ? t('wd_ready') : t('wd_need', { n: fmt(minC - bal, 1), u: fmt(w.minUsd) })}</p>
        <p className="hint center rate">{t('rate', { n: fmt(cfg.usdRate) })}</p>
        {w.enabled && <button className="btn big vault-withdraw" onClick={() => setChannelNoticeOpen(true)}><Icon name="wallet" size={19} /> <span>{t('wd_btn')}</span></button>}
      </section>

      {w.enabled && withdrawFormOpen ? (
        <section className="glass form withdraw-form">
          <div className="withdraw-form-heading">
            <h3 className="sec-h">{t('wd_title')}</h3>
            <span className="ton-only-tag">TON ONLY</span>
          </div>
          <label>{t('wd_method')}</label>
          <div className="ton-method-card">
            <span className="ton-method-mark">TON</span>
            <span><b>TON Network</b><small>{t('wd_ton_only')}</small></span>
            <Icon name="check" size={19} />
          </div>
          <label>{t('wd_addr')}</label>
          <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="TON wallet address" dir="ltr" autoComplete="off" />
          <p className="hint withdraw-ton-hint">{t('wd_ton_hint')}</p>
          <label>{t('wd_amount')}</label>
          <div className="amt">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={fmt(minC)} dir="ltr" />
            <button className="btn small ghost" onClick={() => setAmount(String(Math.floor(bal * 1000) / 1000))}>{t('max')}</button>
          </div>
          <p className="hint">{amt > 0 ? `≈ $${fmt(amtUsd, 3)}` : ''}</p>
          <button className="btn big" disabled={busy || bal < minC} onClick={submit}><Icon name="wallet" size={20} /> <span>{t('wd_btn')}</span></button>
        </section>
      ) : (!w.enabled ? (
        <p className="hint center">{t('wd_off')}</p>
      ) : null)}

      <section className="glass form">
        <h3 className="sec-h"><Icon name="gift" size={16} /> {t('gift_title')}</h3>
        <div className="amt">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" dir="ltr" autoComplete="off" />
          <button className="btn small" disabled={busy} onClick={redeem}>{t('redeem')}</button>
        </div>
      </section>

      {state.withdrawals.length > 0 && (
        <section className="glass">
          <h3 className="sec-h">{t('wd_hist')}</h3>
          {state.withdrawals.map((x) => (
            <div key={x.id} className="hrow">
              <span>#{x.id} · {x.method}<small>{new Date(x.created_at).toLocaleDateString('en-GB')}</small></span>
              <b>${fmt(x.usd, 3)}</b>
              <span className={`pill ${x.status}`}>{t(`st_${x.status}`)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="support-card glass">
        <div className="support-symbol"><Icon name="tg" size={22} /></div>
        <div className="support-copy"><b>{t('support_title')}</b><span>{t('support_withdraw_help')}</span><small>@SLYMintX_SUPPORT</small></div>
        <button className="btn small" onClick={() => open(SUPPORT_URL)}>{t('contact')}</button>
      </section>

      <div className="links">
        <button className="btn ghost small" onClick={() => open(PAYMENT_CHANNEL_URL)}><Icon name="tg" size={16} /> {t('payments')}</button>
        {cfg.channelUrl && <button className="btn ghost small" onClick={() => open(cfg.channelUrl)}><Icon name="tg" size={16} /> {t('news')}</button>}
      </div>
      </div>
    </>
  )
}
