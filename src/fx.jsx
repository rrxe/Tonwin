import React, { useEffect, useMemo, useRef } from 'react'

/**
 * مؤثرات حركة بأسلوب React Bits — بدون أي مكتبة إضافية (React + CSS + canvas فقط).
 * كلها تحترم prefers-reduced-motion وتوقف نفسها لما التطبيق يختفي.
 */
const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Particles — جسيمات تطفو بالخلفية وتتحرك بتأثير اللمس (canvas خفيف) */
export function Particles({ count = 34 }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || reduced()) return
    const ctx = cv.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = 0
    let h = 0
    let raf = 0
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }
    const resize = () => {
      w = cv.clientWidth
      h = cv.clientHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const P = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.00006,
      vy: -(0.00004 + Math.random() * 0.00013),
      a: 0.25 + Math.random() * 0.5,
      z: 0.3 + Math.random() * 0.7,
      tw: Math.random() * 6.28,
      c: Math.random() < 0.35 ? '214,245,140' : '38,118,92',
    }))
    let last = performance.now()
    const draw = (t) => {
      const dt = Math.min(50, t - last)
      last = t
      mouse.x += (mouse.tx - mouse.x) * 0.06
      mouse.y += (mouse.ty - mouse.y) * 0.06
      ctx.clearRect(0, 0, w, h)
      for (const p of P) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.tw += dt * 0.002
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        const px = (p.x + (mouse.x - 0.5) * 0.04 * p.z) * w
        const py = (p.y + (mouse.y - 0.5) * 0.04 * p.z) * h
        const al = p.a * (0.6 + 0.4 * Math.sin(p.tw))
        ctx.fillStyle = `rgba(${p.c},${al * 0.16})`
        ctx.beginPath()
        ctx.arc(px, py, p.r * 3.2, 0, 6.283)
        ctx.fill()
        ctx.fillStyle = `rgba(${p.c},${al})`
        ctx.beginPath()
        ctx.arc(px, py, p.r, 0, 6.283)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw) } }
    const stop = () => { cancelAnimationFrame(raf); raf = 0 }
    const vis = () => (document.visibilityState === 'visible' ? start() : stop())
    const move = (e) => { mouse.tx = e.clientX / window.innerWidth; mouse.ty = e.clientY / window.innerHeight }
    start()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', vis)
    return () => {
      stop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [count])
  return <canvas ref={ref} className="fx-particles" aria-hidden="true" />
}

/** AmbientSpotlight — توهج يلحق الإصبع/المؤشر (نفس فكرة SLY) */
export function AmbientSpotlight() {
  const el = useRef(null)
  useEffect(() => {
    const n = el.current
    if (!n || reduced()) return
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, down = false
    const tick = () => {
      x += (tx - x) * 0.22
      y += (ty - y) * 0.22
      n.style.transform = `translate3d(${x}px,${y}px,0)`
      raf = down || Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const onDown = (e) => { tx = x = e.clientX; ty = y = e.clientY; down = true; n.style.opacity = 1; kick() }
    const onMove = (e) => { tx = e.clientX; ty = e.clientY; if (down) kick() }
    const onUp = () => { down = false; n.style.opacity = 0 }
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])
  return <div ref={el} className="fx-spot" aria-hidden="true" />
}

/** ClickSpark — شرارات تتطاير من مكان الضغط على الأزرار والكروت */
export function ClickSpark() {
  useEffect(() => {
    if (reduced()) return
    const onDown = (e) => {
      if (!e.target.closest?.('button,.btn,.glass')) return
      const n = 9
      for (let i = 0; i < n; i += 1) {
        const s = document.createElement('i')
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4
        const d = 20 + Math.random() * 18
        s.className = 'fx-spark'
        s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px;--rot:${a.toFixed(2)}rad`
        document.body.appendChild(s)
        setTimeout(() => s.remove(), 650)
      }
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])
  return null
}

/**
 * useCardFx — تفويض أحداث واحد يشغّل:
 *  - SpotlightCard: توهج يتبع الإصبع داخل أي كرت .glass
 *  - Tilt: ميلان ثلاثي الأبعاد للمفاعل .reactor
 */
export function useCardFx() {
  useEffect(() => {
    if (reduced()) return
    let card = null
    let tilt = null
    const resetTilt = () => {
      if (!tilt) return
      tilt.style.setProperty('--rx', '0deg')
      tilt.style.setProperty('--ry', '0deg')
      tilt = null
    }
    const upd = (e) => {
      const c = e.target.closest?.('.glass') || null
      if (card && card !== c) card.classList.remove('spot')
      if (c) {
        const r = c.getBoundingClientRect()
        c.style.setProperty('--mx', `${e.clientX - r.left}px`)
        c.style.setProperty('--my', `${e.clientY - r.top}px`)
        c.classList.add('spot')
      }
      card = c
      const rc = e.target.closest?.('.reactor') || null
      if (rc) {
        const r = rc.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        rc.style.setProperty('--ry', `${(nx * 18).toFixed(1)}deg`)
        rc.style.setProperty('--rx', `${(-ny * 18).toFixed(1)}deg`)
        if (tilt && tilt !== rc) resetTilt()
        tilt = rc
      } else resetTilt()
    }
    const end = () => {
      if (card) card.classList.remove('spot')
      card = null
      resetTilt()
    }
    window.addEventListener('pointermove', upd, { passive: true })
    window.addEventListener('pointerdown', upd, { passive: true })
    window.addEventListener('pointerup', end, { passive: true })
    window.addEventListener('pointercancel', end, { passive: true })
    document.documentElement.addEventListener('pointerleave', end)
    return () => {
      window.removeEventListener('pointermove', upd)
      window.removeEventListener('pointerdown', upd)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.documentElement.removeEventListener('pointerleave', end)
    }
  }, [])
}

/** ShinyText — لمعة تمر على النص */
export function ShinyText({ text, speed = 3.4, className = '' }) {
  return <span className={`shiny ${className}`} style={{ '--sp': `${speed}s` }}>{text}</span>
}

/** BlurText — الكلمات تدخل بالتدريج من الضبابية (بالكلمة، عشان الحروف العربية تبقى متصلة) */
export function BlurText({ text, delay = 70, className = '' }) {
  const words = String(text ?? '').split(' ')
  return (
    <span className={`blurtext ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="bt-w" style={{ animationDelay: `${i * delay}ms` }}>
          {w}{i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  )
}

/** Embers — شرارات صغيرة تطلع للأعلى (تظهر لما الجوهرة جاهزة للاستلام) */
export function Embers({ count = 12 }) {
  const items = useMemo(
    () => Array.from({ length: count }, () => ({
      l: 12 + Math.random() * 76,
      s: 2 + Math.random() * 3,
      rise: -(50 + Math.random() * 90),
      dx: (Math.random() - 0.5) * 34,
      d: 1.6 + Math.random() * 2.2,
      dl: -Math.random() * 3,
    })),
    [count]
  )
  return (
    <div className="embers" aria-hidden="true">
      {items.map((e, i) => (
        <i key={i} style={{ left: `${e.l}%`, '--s': `${e.s}px`, '--rise': `${e.rise}px`, '--dx': `${e.dx}px`, animationDuration: `${e.d}s`, animationDelay: `${e.dl}s` }} />
      ))}
    </div>
  )
}
