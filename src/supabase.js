import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hcdcvhqojengvukbiwli.supabase.co'
const SUPABASE_KEY = 'sb_publishable_ApbvOQz9Y31PsP1E2xHrjQ_uvh8PI64'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
