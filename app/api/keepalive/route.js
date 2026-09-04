import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Called daily by the Vercel Cron Job (see vercel.json) so Supabase always
// sees API activity and never triggers its free-tier auto-pause (which
// kicks in after 7 days without requests).
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { error } = await supabase.from('tenants').select('id').limit(1)

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    supabaseError: error?.message ?? null,
  })
}
