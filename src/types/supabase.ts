export interface SupabaseConfig {
  url: string
  key: string
}

export interface ColumnInfo {
  name: string
  type: string
  description?: string
  isNullable: boolean
  isList?: boolean
}

export interface TableInfo {
  name: string
  description?: string
  columns: ColumnInfo[]
  schema?: string
  rowCount?: number
  size?: string
  primaryKeyColumn?: string
}

export interface ConnectionResult {
  success: boolean
  message: string
  tables?: TableInfo[]
  error?: string
}

export interface TablePreviewResult {
  success: boolean
  data?: any[]
  message?: string
  error?: string
} 