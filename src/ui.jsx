import React, { useEffect, useId, useRef, useState } from 'react'

export function fmt(n, max = 3) {
  const v = Number(n || 0)
  return v.toLocaleString('en', { maximumFractionDigits: max, minimumFractionDigits: 0 })
}

/** عدّاد متحرك للأرقام */
export function CountUp({ value, max = 3 }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const a = from.current
    const b = value
    if (a === b) return
    const t0 = performance.now()
    const dur = 700
    let raf
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(a + (b - a) * e)
      if (k < 1) raf = requestAnimationFrame(step)
      else from.current = b
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{fmt(shown, max)}</>
}

/** ألوان STORMY: زمردي، نعناعي، وأخضر عميق */
export const TONES = {
  steel: { h: 151, s: 48, l: 0 },
  ice: { h: 84, s: 78, l: 12 },
  deep: { h: 159, s: 38, l: -19 },
}

/** جوهرة بأوجه (SVG) — tone: steel | ice | deep */
export function Gem({ size = 48, tone = 'steel', shine = true, className = '' }) {
  const id = useId().replace(/:/g, '')
  const T = TONES[tone] || TONES.steel
  const L = [64, 80, 56, 46, 60, 40, 52]
  const c = (i, s = 0) => `hsl(${T.h} ${Math.min(100, T.s + s)}% ${Math.max(8, Math.min(92, L[i] + T.l))}%)`
  return (
    <svg className={`gem ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <clipPath id={`c${id}`}>
          <polygon points="60,30 140,30 185,75 100,185 15,75" />
        </clipPath>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`i${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D6F58C" stopOpacity=".38" />
          <stop offset=".5" stopColor="#D6F58C" stopOpacity=".0" />
          <stop offset="1" stopColor="#26765C" stopOpacity=".28" />
        </linearGradient>
      </defs>
      <g>
        <polygon points="60,30 100,75 15,75" fill={c(0)} />
        <polygon points="60,30 140,30 100,75" fill={c(1, 6)} />
        <polygon points="140,30 185,75 100,75" fill={c(2)} />
        <polygon points="15,75 58,75 100,185" fill={c(3)} />
        <polygon points="58,75 100,75 100,185" fill={c(4)} />
        <polygon points="185,75 142,75 100,185" fill={c(5)} />
        <polygon points="142,75 100,75 100,185" fill={c(6)} />
        <polygon points="60,30 140,30 185,75 100,185 15,75" fill={`url(#i${id})`} />
        <path d="M60 30 L100 75 L140 30 M15 75 H185 M58 75 L100 185 L142 75" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" fill="none" />
      </g>
      {shine && (
        <g clipPath={`url(#c${id})`}>
          <rect className="gem-shine" x="-120" y="0" width="80" height="200" fill={`url(#s${id})`} transform="skewX(-20)" />
        </g>
      )}
    </svg>
  )
}

const P = {
  mine: 'M12 2l8 5v10l-8 5-8-5V7l8-5zm0 5l-4 2.5v5L12 17l4-2.5v-5L12 7z',
  wheel: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2v8l6-4.5A8 8 0 0012 4zm0 8l-6-4.5A8 8 0 004 12h8zm0 0l-6 4.5A8 8 0 0012 20v-8zm0 0h8a8 8 0 01-2 5.2L12 12z',
  tasks: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm3.2 8.6l2.4 2.4 5.2-5.2-1.4-1.4-3.8 3.8-1-1-1.4 1.4z',
  friends: 'M9 11a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6H2zm14.5-5.6c3 .3 5.5 2.4 5.5 5.6h-4c0-2-.6-3.9-1.5-5.6z',
  wallet: 'M4 6h15a2 2 0 012 2v1h-5a3 3 0 000 6h5v1a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm13 5.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  ad: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm6 3v8l6-4-6-4z',
  link: 'M10.6 13.4a1 1 0 001.4 1.4l4-4a3 3 0 10-4.2-4.2l-1 1 1.4 1.4 1-1a1 1 0 011.4 1.4l-4 4zm2.8-2.8a1 1 0 00-1.4-1.4l-4 4a3 3 0 104.2 4.2l1-1-1.4-1.4-1 1a1 1 0 01-1.4-1.4l4-4z',
  tg: 'M21.5 4.5L2.8 11.7c-.8.3-.8 1.4 0 1.7l4.6 1.5 1.8 5.4c.2.6 1 .8 1.4.3l2.6-2.5 4.7 3.5c.5.4 1.3.1 1.4-.6l3.2-15.6c.2-.8-.6-1.5-1.5-1.1zM9.5 14.2l8.2-5-6.4 6.5-.4 2.6-1.4-4.1z',
  check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  copy: 'M8 3h10a2 2 0 012 2v12h-2V5H8V3zM4 7h10a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z',
  share: 'M18 16a3 3 0 00-2.4 1.2L8.9 13.6a3 3 0 000-3.2l6.7-3.6A3 3 0 1015 5a3 3 0 00.1.8L8.4 9.4a3 3 0 100 5.2l6.7 3.6A3 3 0 1018 16z',
  crown: 'M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7zm2 13h14v2H5v-2z',
  fire: 'M12 2c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z',
  globe: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.2 1.4 2 3.4 2.4 6H9.6C10 7.4 10.8 5.4 12 4zM4.3 10a8 8 0 014-5.2C7.5 6.2 7 8 6.8 10H4.3zm0 2h2.5c.2 2 .7 3.800 1.500 5.200A8 8 0 014.300 12zm5.300 0h4.800c-.4 2.600-1.200 4.600-2.400 6-1.200-1.400-2-3.400-2.400-6zm6.600 0h2.500a8 8 0 01-4 5.200c.8-1.400 1.300-3.200 1.500-5.200zm0-2c-.2-2-.7-3.800-1.500-5.200a8 8 0 014 5.200h-2.500z',
  gift: 'M20 7h-2.2A3 3 0 0012 4.800 3 3 0 006.200 7H4a1 1 0 00-1 1v3h18V8a1 1 0 00-1-1zM9 7a1 1 0 112 0v0H9zm4 0a1 1 0 112 0h-2zM4 13v7a1 1 0 001 1h6v-8H4zm9 0v8h6a1 1 0 001-1v-7h-7z',
  lock: 'M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z',
}

export function Icon({ name, size = 22, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={P[name] || P.mine} />
    </svg>
  )
}

export function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/** شظايا جواهر تتطاير (احتفال) */
export function Shards({ run, count = 22 }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    if (!run) return
    setItems(
      Array.from({ length: count }, (_, i) => ({
        id: `${run}-${i}`,
        dx: (Math.random() - 0.5) * 320,
        dy: -120 - Math.random() * 260,
        rot: Math.random() * 540 - 270,
        tone: ['steel', 'ice', 'steel', 'ice', 'deep', 'ice'][i % 6],
        size: 12 + Math.random() * 16,
        delay: Math.random() * 120,
      }))
    )
    const t = setTimeout(() => setItems([]), 1600)
    return () => clearTimeout(t)
  }, [run, count])
  if (!items.length) return null
  return (
    <div className="shards" aria-hidden="true">
      {items.map((s) => (
        <span key={s.id} className="shard" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--rot': `${s.rot}deg`, animationDelay: `${s.delay}ms` }}>
          <Gem size={s.size} tone={s.tone} shine={false} />
        </span>
      ))}
    </div>
  )
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function hms(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const x = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
}
