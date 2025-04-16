// Tipos do Supabase
export interface SupabaseConfig {
  url: string
  key: string
}

export interface ConnectionResult {
  success: boolean
  message: string
  error?: string
}

// Tipos de mapeamento Supabase -> Framer
export interface FieldMapping {
  supabaseField: string
  framerField: string
  type: FieldType
}

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array'

// Tipos de configuração do plugin
export interface PluginConfig {
  supabase: SupabaseConfig
  tableName?: string
  fieldMappings: FieldMapping[]
  syncEnabled: boolean
} 