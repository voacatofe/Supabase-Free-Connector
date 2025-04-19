import { TableInfo } from './supabase'

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

export interface FieldMapping {
  supabaseField: string
  framerField: string
  type: FieldType
}

export interface PluginConfig {
  supabase: {
    url: string
    key: string
  }
  selectedTable?: TableInfo
  fieldMappings: FieldMapping[]
  syncEnabled: boolean
  lastSyncTime?: string
  syncInterval?: number
}

// Tipos específicos do Framer
export interface FramerProperty {
  type: FieldType
  title: string
  description?: string
  defaultValue?: any
  hidden?: boolean
  optional?: boolean
}

export interface FramerPropertyControls {
  [key: string]: FramerProperty
}

export interface FramerComponentProps {
  propertyControls: FramerPropertyControls
  defaultProps: Record<string, any>
}

export interface FramerStyles {
  container: React.CSSProperties
  form: React.CSSProperties
  input: React.CSSProperties
  button: React.CSSProperties
  successMessage: React.CSSProperties
  errorMessage: React.CSSProperties
  tableContainer: React.CSSProperties
  table: React.CSSProperties
  tableHeader: React.CSSProperties
  tableCell: React.CSSProperties
}

export const defaultFramerStyles = {
  container: {
    backgroundColor: 'var(--framer-color-bg)',
    color: 'var(--framer-color-text)',
    maxHeight: '80vh',
    width: '100%',
    overflow: 'auto',
    borderRadius: '8px',
    padding: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--framer-color-divider)',
    borderRadius: '6px',
    backgroundColor: 'var(--framer-color-bg)',
    color: 'var(--framer-color-text)',
    outline: 'none'
  },
  button: {
    width: '100%',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'var(--framer-color-tint)',
    color: 'var(--framer-color-bg)',
    transition: 'opacity 0.2s ease'
  },
  successMessage: {
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'var(--framer-color-bg-secondary)',
    border: '1px solid var(--framer-color-divider)',
    color: 'var(--framer-color-text)'
  },
  errorMessage: {
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'var(--framer-color-bg-tertiary)',
    border: '1px solid var(--framer-color-divider)',
    color: 'var(--framer-color-text-tertiary)'
  },
  tableContainer: {
    marginTop: '16px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'var(--framer-color-bg)',
    border: '1px solid var(--framer-color-divider)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px'
  },
  tableHeader: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontWeight: 500,
    color: 'var(--framer-color-text-secondary)',
    backgroundColor: 'var(--framer-color-bg-secondary)',
    borderBottom: '1px solid var(--framer-color-divider)'
  },
  tableCell: {
    padding: '8px 12px',
    color: 'var(--framer-color-text)',
    borderBottom: '1px solid var(--framer-color-divider)',
    backgroundColor: 'var(--framer-color-bg)'
  }
} 