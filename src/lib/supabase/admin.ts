import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Klien Supabase dengan SERVICE ROLE key.
 *
 * PENTING:
 *  - Hanya boleh dipakai di server (Route Handler / Server Action).
 *    Key ini BYPASS RLS, jadi JANGAN pernah bocor ke browser.
 *  - Karena bypass RLS, isolasi antar-tenant di endpoint ini WAJIB
 *    ditegakkan di kode (selalu filter/insert pakai family_id hasil
 *    lookup server-side, bukan dari input client).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di environment.',
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
