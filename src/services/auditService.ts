import { supabase } from '@/lib/supabase'

export const auditService = {
  async log(action: string, metadata: Record<string, unknown>): Promise<void> {
    const url = import.meta.env.VITE_SUPABASE_URL
    if (!url || typeof url !== 'string') return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert({
        action,
        user_id: user?.id ?? null,
        metadata: metadata as Record<string, never>,
      })
    } catch {
      /* audit failure must not break app */
    }
  },
}
