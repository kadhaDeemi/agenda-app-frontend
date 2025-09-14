import { createClient } from '@supabase/supabase-js'

// Lee las variables de env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

//Se crea y exporta cliente para usarlo en la app
export const supabase = createClient(supabaseUrl, supabaseKey)