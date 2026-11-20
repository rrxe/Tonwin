import { createClient } from '@supabase/supabase-js'

// متغيرات البيئة المطلوبة: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('[supabase] ضبط SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY ضروري')
}

export const db = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: false },
})
