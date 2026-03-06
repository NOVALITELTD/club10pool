import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
```

Also make sure these two are in your Vercel environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://kyzsfcstbpkpezwwnicj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_gcK8w_7LVV2vMWWm8t0uiA_ehbcjAN4