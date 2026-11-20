import React, { useState } from 'react'
import { BlurText } from '../fx.jsx'
import { Gem, Icon, fmt, useNow } from '../ui.jsx'
import { api, haptic, hapticOk } from '../lib/api.js'

const tg = window.Telegram?.WebApp

function openUrl(url) {
  if (!url) return
  try {
    if (/^https?:\/\/t\.me\//i.test(url) && tg?.openTelegramLink) tg.openTelegramLink(url)
    else if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  } catch {
    window.open(url, '_blank')
  }
}

export default function Tasks({ ctx }) {
  const { state, t, lang, gated, toast } = ctx
  const now = useNow(1000)
  const [opened, setOpened] = useState({}) // id -> ts
  const [busyId, setBusyId] = useState(null)

  async function open(task) {
    haptic()
    setOpened((o) => ({ ...o, [task.id]: Date.now() }))
    api('task_start', { id: task.id }).catch(() => {})
    openUrl(task.url)
  }

  async function claim(task) {
    if (busyId) return
    setBusyId(task.id)
    try {
      const j = await gated('task', task.type === 'ad', 'task_claim', { id: task.id })
      hapticOk()
      toast(`+${fmt(j.reward)} 💎`, 'ok')
    } catch (e) {
      ctx.fail(e)
    } finally {
      setBusyId(null)
    }
  }

  const sorted = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <div className="page">
      <h2 className="ptitle"><BlurText text={t('tasks_title')} /></h2>
      {sorted.length === 0 && <p className="hint center">{t('tasks_empty')}</p>}
      <div className="list">
        {sorted.map((k) => {
          const title = lang === 'en' && k.titleEn ? k.titleEn : k.title
          const o = opened[k.id]
          const left = o ? Math.max(0, Math.ceil((k.wait * 1000 - (now - o)) / 1000)) : null
          let action = null
          if (k.done) {
            action = <span className="done-mark"><Icon name="check" size={18} /></span>
          } else if (k.type === 'ad') {
            action = (
              <button className="btn small" disabled={busyId === k.id} onClick={() => claim(k)}>
                <Icon name="ad" size={16} /> <span>{t('watch')}</span>
              </button>
            )
          } else if (k.type === 'link') {
            action = !o ? (
              <button className="btn small ghost" onClick={() => open(k)}>{t('open')}</button>
            ) : left > 0 ? (
              <button className="btn small ghost mono" disabled>{left}s</button>
            ) : (
              <button className="btn small" disabled={busyId === k.id} onClick={() => claim(k)}>{t('claim')}</button>
            )
          } else {
            action = !o ? (
              <button className="btn small ghost" onClick={() => open(k)}>{t('join')}</button>
            ) : (
              <button className="btn small" disabled={busyId === k.id} onClick={() => claim(k)}>{t('verify')}</button>
            )
          }
          return (
            <div key={k.id} className={`task glass ${k.done ? 'is-done' : ''}`}>
              <div className="task-ic">
                <Icon name={k.type === 'ad' ? 'ad' : k.type === 'channel' ? 'tg' : 'link'} size={22} />
              </div>
              <div className="task-body">
                <b>{title}</b>
                <span className="reward"><Gem size={14} tone="steel" shine={false} /> +{fmt(k.reward)}{k.daily && <em>{t('daily_tag')}</em>}</span>
              </div>
              {action}
            </div>
          )
        })}
      </div>
    </div>
  )
}
