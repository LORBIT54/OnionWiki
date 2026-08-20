import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i), line.slice(i + 1)]
    }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await supabase.from('documents').select('id, updated_at').eq('id', 'main').maybeSingle()

if (error) {
  console.log('STATUS', error.code || 'ERROR')
  console.log('MESSAGE', error.message)
  process.exit(1)
}

console.log('OK', data ? 'row exists' : 'table reachable, no row')
