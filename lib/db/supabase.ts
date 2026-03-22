// Supabase client factory
//
// Two variants:
//   serverClient() — uses the service role key, bypasses RLS.
//                    Call only from server-side code (API routes, Server Actions).
//                    Never expose the service role key to the browser.
//
//   browserClient() — uses the anon key, subject to RLS policies.
//                     Safe to call from client components.
//
// Both clients are created on demand (not module-level singletons) to avoid
// accidentally sharing state across requests in a serverless environment.

import { createClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';

/** Server-side client using the service role key. Bypasses RLS. */
export function serverClient() {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      // Disable cookie-based session persistence — server clients are stateless
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Browser-safe client using the anon key. Subject to RLS. */
export function browserClient() {
  return createClient(config.supabase.url, config.supabase.anonKey);
}
