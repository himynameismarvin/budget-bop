import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

// Types for our database schema
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  country: string
  province_state: string
  age: number
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  group_name: string
  default_budget: number
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: number
  year: number
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  account_type: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id?: string
  category_id?: string
  amount: number
  description: string
  transaction_date: string
  vendor?: string
  hash?: string
  is_income: boolean
  created_at: string
  updated_at: string
}

export interface Rule {
  id: string
  user_id: string
  vendor_regex: string
  category_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}