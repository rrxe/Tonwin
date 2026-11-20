import React, { useEffect, useState } from 'react'
import { BlurText } from '../fx.jsx'
import { Gem, Icon, fmt } from '../ui.jsx'
import { api, haptic } from '../lib/api.js'

const tg = window.Telegram?.WebApp

export default function Friends({ ctx }) {
  const { state, cfg, t, toast } = ctx
  const [tab, setTab] = useState('invite')
  const [fr, setFr] = useState(null)
  const [lb, setLb] = useState(null)

  const link = `${cfg.shareBase}${state.me.id}` // shareBase ينتهي بـ ref_

  useEffect(() => {
    if (tab === 'invite') api('friends').then(setFr).catch(() => {})
    else api('leaderboard').then(setLb).catch(() => {})
  }, [tab])

  function copy() {
    haptic()
    const done = () => toast(t('copied'), 'ok')
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, done)
    else done()
  }
  function share() {
    haptic()
    const text = encodeURIComponent(t('share_text', { n: cfg.appName }))
    const u = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`
    if (tg?.openTelegramLink) tg.openTelegramLink(u)
    else window.open(u, '_blank')
  }

  return (
    <div className="page">
      <div className="seg">
        <button className={tab === 'invite' ? 'on' : ''} onClick={() => setTab('invite')}>{t('fr_tab_invite')}</button>
        <button className={tab === 'top' ? 'on' : ''} onClick={() => setTab('top')}>{t('fr_tab_top')}</button>
      </div>

      {tab === 'invite' ? (
        <>
          <section className="glass hero-ref">
            <div className="hero-gems"><Gem size={54} tone="ice" /><Gem size={78} tone="steel" /><Gem size={54} tone="deep" /></div>
            <h3><BlurText text={t('fr_title')} /></h3>
            <p className="hint">{t('fr_sub', { r: fmt(cfg.refReward), p: fmt(cfg.refCommission) })}</p>
            <div className="linkbox mono">{link.replace('https://', '')}</div>
            <div className="row2">
              <button className="btn" onClick={share}><Icon name="share" size={18} /> <span>{t('share')}</span></button>
              <button className="btn ghost" onClick={copy}><Icon name="copy" size={18} /> <span>{t('copy')}</span></button>
            </div>
          </section>

          <div className="stats3">
            <div className="stat glass"><b>{state.refs.total}</b><span>{t('fr_total')}</span></div>
            <div className="stat glass"><b>{state.refs.qualified}</b><span>{t('fr_qualified')}</span></div>
            <div className="stat glass"><b>{fr ? fmt(fr.refEarned) : '…'}</b><span>{t('fr_earned')}</span></div>
          </div>

          <section className="glass steps">
            <div><i>1</i><p>{t('fr_s1')}</p></div>
            <div><i>2</i><p>{t('fr_s2', { n: cfg.refRequiredAds })}</p></div>
            <div><i>3</i><p>{t('fr_s3', { r: fmt(cfg.refReward), b: fmt(cfg.refBonusPerRef), c: fmt(cfg.refBonusCap) })}</p></div>
          </section>

          {fr?.friends?.length > 0 && (
            <section className="glass">
              <h3 className="sec-h">{t('fr_list')}</h3>
              {fr.friends.map((f, i) => (
                <div key={i} className="frow">
                  <span className="av">{(f.name || '?').slice(0, 1).toUpperCase()}</span>
                  <b>{f.name}</b>
                  <span className={`pill ${f.paid ? 'ok' : ''}`}>{f.paid ? t('fr_ok') : `${f.ads}/${cfg.refRequiredAds}`}</span>
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="glass lb">
          {!lb && <p className="hint center">…</p>}
          {lb?.rows.map((r) => (
            <div key={r.rank} className={`lrow ${r.me ? 'me' : ''} r${r.rank}`}>
              <span className="rk">{r.rank <= 3 ? <Icon name="crown" size={18} /> : r.rank}</span>
              <span className="av">{r.photo ? <img src={r.photo} alt="" referrerPolicy="no-referrer" /> : (r.name || '?').slice(0, 1).toUpperCase()}</span>
              <b>{r.name}</b>
              <span className="lv"><Gem size={14} tone="steel" shine={false} /> {fmt(r.total, 1)}</span>
            </div>
          ))}
          {lb && <p className="hint center">{t('lb_me', { n: lb.myRank })}</p>}
        </section>
      )}
    </div>
  )
}
