// Exporta os tipos do Supabase e Framer diretamente
export * from './supabase'
export * from './framer'

// Tipos adicionais para o plugin
export interface Table {
  name: string
  description?: string
  schema: string
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  isPrimaryKey: boolean
  type: string
}

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'color'
  | 'formattedText'
  | 'image'
  | 'file'
  | 'link'
  | 'enum'
  | 'collectionReference'
  | 'multiCollectionReference'
  | 'object'
  | 'array'

export interface PluginConfig {
  supabaseConfig: import('./supabase').SupabaseConfig | null
  fieldMappings: FieldMapping[]
} 