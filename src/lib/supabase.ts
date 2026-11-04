import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true, лише якщо обидві env-змінні задані. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Клієнт створюється тільки за наявності конфігурації. Інакше застосунок
 * працює повністю локально й не робить запитів до неіснуючого домену.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

let userIdPromise: Promise<string | null> | null = null;

async function resolveUserId(client: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await client.auth.getSession();
    if (data.session?.user.id) return data.session.user.id;

    // Анонімна сесія дає стабільний user_id для RLS-політик
    const { data: anon, error } = await client.auth.signInAnonymously();
    if (error) {
      console.warn('Supabase auth unavailable:', error.message);
      return null;
    }
    return anon.session?.user.id ?? null;
  } catch (err) {
    console.warn('Supabase auth failed:', err);
    return null;
  }
}

/**
 * Повертає id поточного (анонімного) користувача Supabase.
 * Якщо Supabase не налаштований — null.
 */
export function getSupabaseUserId(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null);
  userIdPromise ??= resolveUserId(supabase);
  return userIdPromise;
}
