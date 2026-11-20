import React, { useMemo, useRef, useState } from 'react'
import { BlurText } from '../fx.jsx'
import { Gem, Icon, Modal, Shards, fmt } from '../ui.jsx'
import { haptic, hapticOk } from '../lib/api.js'

const N = 15
const STEP = 360 / N
const RAD = 138

// STORMY wheel palette: forest, emerald, mint, and lime
const TIERS = [
  { from: '#174537', to: '#246A51', tone: 'deep' },
  { from: '#247453', to: '#36966B', tone: 'steel' },
  { from: '#53A77D', to: '#8CCB8C', tone: 'steel' },
  { from: '#A8D86D', to: '#D6F58C', tone: 'ice' },
]
const tierIdx = (v) => (v <= 5 ? 0 : v <= 9 ? 1 : v <= 12 ? 2 : 3)
const tierName = (v) => (v <= 5 ? 'common' : v <= 9 ? 'rare' : v <= 12 ? 'epic' : 'legend')

function wedge(i) {
  const a0 = ((i * STEP - STEP / 2) * Math.PI) / 180
  const a1 = ((i * STEP + STEP / 2) * Math.PI) / 180
  const p = (a) => `${(RAD * Math.sin(a)).toFixed(2)} ${(-RAD * Math.cos(a)).toFixed(2)}`
  return `M0 0 L${p(a0)} A${RAD} ${RAD} 0 0 1 ${p(a1)} Z`
}

export default function Spin({ ctx }) {
  const { state, cfg, t, gated } = ctx
  const s = state.spin
  const [rot, setRot] = useState(0)
  const [busy, setBusy] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [burst, setBurst] = useState(0)
  const pending = useRef(null)

  const weights = cfg.spinWeights
  const total = weights.reduce((a, b) => a + b, 0) || 1
  const tiers = useMemo(() => {
    const acc = { common: 0, rare: 0, epic: 0, legend: 0 }
    weights.forEach((w, i) => { acc[tierName(i + 1)] += (w / total) * 100 })
    return acc
  }, [weights, total])

  async function go() {
    if (busy || spinning || s.left <= 0) return
    setBusy(true)
    haptic('medium')
    try {
      const j = await gated('spin', s.ad, 'spin', {}, { defer: true })
      pending.current = j.state
      const v = j.value
      const theta = (v - 1) * STEP
      const jitter = (Math.random() - 0.5) * (STEP * 0.6)
      const base = Math.ceil(rot / 360) * 360 + 360 * 6
      setSpinning(true)
      setRot(base + ((360 - theta) % 360) + jitter)
      pending.current = { state: j.state, value: v }
    } catch (e) {
      ctx.fail(e)
      setBusy(false)
    }
  }

  function done() {
    if (!spinning || !pending.current) return
    const { state: st, value } = pending.current
    pending.current = null
    ctx.setState(st)
    setSpinning(false)
    setBusy(false)
    setResult(value)
    setBurst(Date.now())
    hapticOk()
  }

  return (
    <div className="page">
      <Shards run={burst} count={30} />
      <div className="spin-head">
        <h2><BlurText text={t('spin_title')} /></h2>
        <div className="pips" title={t('spin_left', { n: s.left })}>
          {Array.from({ length: s.limit }, (_, i) => (
            <i key={i} className={i < s.limit - s.left ? 'off' : 'on'} />
          ))}
        </div>
      </div>
      <p className="hint center">{t('spin_sub', { n: s.left, l: s.limit })}</p>

      <div className="wheel-wrap">
        <div className="beam" />
        <div className="pointer" />
        <svg className="wheel" viewBox="-150 -150 300 300" style={{ transform: `rotate(${rot}deg)` }} onTransitionEnd={done}>
          <defs>
            {TIERS.map((c, k) => (
              <radialGradient key={k} id={`wg${k}`} cx="0" cy="0" r={RAD} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={c.from} />
                <stop offset="1" stopColor={c.to} />
              </radialGradient>
            ))}
          </defs>
          <circle r="146" fill="#FFFFFF" stroke="rgba(38,118,92,.22)" strokeWidth="2" />
          {Array.from({ length: N }, (_, i) => {
            const v = i + 1
            const h = tierIdx(v)
            const th = i * STEP
            return (
              <g key={v}>
                <path d={wedge(i)} fill={`url(#wg${h})`} stroke="rgba(255,255,255,.35)" strokeWidth="1" opacity={i % 2 ? 0.88 : 1} />
                <g transform={`rotate(${th}) translate(0 -104)`}>
                  <text textAnchor="middle" dominantBaseline="central" className="wnum" fontSize={v > 9 ? 17 : 19} style={v > 9 ? { fill: '#173F32', stroke: 'rgba(255,255,255,.22)' } : undefined}>{v}</text>
                </g>
                <g transform={`rotate(${th}) translate(0 -66)`}>
                  <circle r="2.6" fill="#fff" opacity=".7" />
                </g>
              </g>
            )
          })}
          <circle r="34" fill="#173F32" stroke="rgba(255,255,255,.48)" strokeWidth="2" />
        </svg>
        <div className="hub"><Gem size={46} tone="steel" /></div>
      </div>

      <button className="btn big" onClick={go} disabled={busy || spinning || s.left <= 0}>
        {s.ad && s.left > 0 && <Icon name="ad" size={20} />}
        <span>{s.left > 0 ? t('spin_btn') : t('spin_none')}</span>
      </button>

      <section className="glass legend">
        <h3>{t('spin_chances')}</h3>
        {['common', 'rare', 'epic', 'legend'].map((k, i) => (
          <div key={k} className="lg-row">
            <i style={{ background: TIERS[i].to }} />
            <span>{t(`tier_${k}`)} <small>{['1–5', '6–9', '10–12', '13–15'][i]}</small></span>
            <b>{tiers[k].toFixed(tiers[k] < 1 ? 1 : 0)}%</b>
          </div>
        ))}
      </section>

      <Modal open={result !== null} onClose={() => setResult(null)}>
        <div className="win">
          <Gem size={110} tone={TIERS[tierIdx(result || 1)].tone} />
          <div className="win-n">+{result}</div>
          <p>{t('spin_win')}</p>
          <button className="btn" onClick={() => setResult(null)}>{t('ok')}</button>
        </div>
      </Modal>
    </div>
  )
}
