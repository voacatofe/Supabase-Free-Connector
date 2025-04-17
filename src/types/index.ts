// Exporta os tipos do Supabase e Framer diretamente
export * from './supabase'
export * from './framer'

// Tipos adicionais para o plugin
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

export interface PluginConfig {
  supabaseConfig: import('./supabase').SupabaseConfig | null
  fieldMappings: FieldMapping[]
} 