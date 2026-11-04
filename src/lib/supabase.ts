import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// Вночі налаштуйте свої змінні: Supabase URL та anon key
// Якщо змінні не визначені, використовуємо fallback значення для розробки
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)