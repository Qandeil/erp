import { supabase } from './supabase';

export async function logActivity(
  userId: string,
  userName: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('activity_logs').insert({
    user_id: userId,
    user_name: userName,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    details: details ?? {},
  });
}
