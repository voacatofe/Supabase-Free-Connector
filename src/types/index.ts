// Tipos do Supabase
export interface SupabaseConfig {
  url: string
  key: string
}

export interface TableInfo {
  name: string
  description: string
}

export interface ConnectionResult {
  success: boolean
  message: string
  error?: string
  tables?: TableInfo[]
}

export interface ColumnInfo {
  name: string
  type: string
  is_nullable: boolean
  is_identity: boolean
}

// Tipos de mapeamento Supabase -> Framer
export interface FieldMapping {
  sourceField: string
  targetField: string
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
  supabaseConfig: SupabaseConfig | null
  fieldMappings: FieldMapping[]
}

export * from './supabase'
export * from './framer' 