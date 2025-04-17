export interface SupabaseConfig {
  url: string
  key: string
}

export interface ColumnInfo {
  name: string
  type: string
  isNullable: boolean
  isIdentity: boolean
}

export interface TableInfo {
  name: string
  schema: string
  rowCount: number
  size: string
  columns: ColumnInfo[]
}

export interface ConnectionResult {
  success: boolean
  message: string
  tables?: TableInfo[]
} 