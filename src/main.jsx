import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const tg = window.Telegram?.WebApp
try {
  tg?.ready()
  tg?.expand()
  tg?.disableVerticalSwipes?.()
  tg?.setHeaderColor?.('#F3F7F3')
  tg?.setBackgroundColor?.('#F3F7F3')
} catch {}

createRoot(document.getElementById('root')).render(<App />)
