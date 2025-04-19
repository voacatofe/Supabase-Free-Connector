import { ColumnInfo } from '../types'

// Tipos do Framer CMS
export type FramerFieldType = 'String' | 'Number' | 'Boolean' | 'Date' | 'Object' | 'Array'

// Interface para o mapeamento de campos
export interface FieldMapping {
    sourceField: string
    targetField: string
    sourceType: string
    targetType: FramerFieldType
}

// Mapa de tipos Supabase para tipos Framer
const typeMapping: Record<string, FramerFieldType> = {
    // Tipos de texto
    'text': 'String',
    'varchar': 'String',
    'char': 'String',
    
    // Tipos numéricos
    'int2': 'Number',
    'int4': 'Number',
    'int8': 'Number',
    'float4': 'Number',
    'float8': 'Number',
    'numeric': 'Number',
    
    // Tipos booleanos
    'bool': 'Boolean',
    'boolean': 'Boolean',
    
    // Tipos de data/hora
    'timestamp': 'Date',
    'timestamptz': 'Date',
    'date': 'Date',
    'time': 'Date',
    'timetz': 'Date',
    
    // Tipos JSON
    'json': 'Object',
    'jsonb': 'Object',
    
    // Arrays
    '_text': 'Array',
    '_int4': 'Array',
    '_int8': 'Array',
    '_float4': 'Array',
    '_float8': 'Array',
    '_bool': 'Array',
    'ARRAY': 'Array'
}

/**
 * Mapeia um tipo do Supabase para um tipo do Framer CMS
 */
export function mapFieldType(supabaseType: string): FramerFieldType {
    // Remove o modificador de array se presente
    const baseType = supabaseType.replace(/\[\]$/, '')
    
    // Verifica se é um tipo de array
    if (supabaseType.endsWith('[]') || supabaseType.startsWith('_')) {
        return 'Array'
    }
    
    // Retorna o tipo mapeado ou 'String' como fallback
    return typeMapping[baseType] || 'String'
}

/**
 * Gera um preview de como o valor será convertido
 */
export function previewFieldValue(value: any, targetType: FramerFieldType): any {
    if (value === null || value === undefined) {
        return null
    }

    try {
        switch (targetType) {
            case 'String':
                return String(value)
            
            case 'Number':
                const num = Number(value)
                return isNaN(num) ? 0 : num
            
            case 'Boolean':
                return Boolean(value)
            
            case 'Date':
                const date = new Date(value)
                return isNaN(date.getTime()) ? null : date.toISOString()
            
            case 'Object':
                if (typeof value === 'string') {
                    return JSON.parse(value)
                }
                return typeof value === 'object' ? value : { value }
            
            case 'Array':
                if (Array.isArray(value)) {
                    return value
                }
                if (typeof value === 'string') {
                    // Tenta converter string JSON para array
                    try {
                        const parsed = JSON.parse(value)
                        return Array.isArray(parsed) ? parsed : [value]
                    } catch {
                        return [value]
                    }
                }
                return [value]
            
            default:
                return value
        }
    } catch (error) {
        console.error(`Erro ao converter valor para ${targetType}:`, error)
        return null
    }
}

/**
 * Gera mapeamentos automáticos para uma lista de colunas
 */
export function generateFieldMappings(columns: ColumnInfo[]): FieldMapping[] {
    return columns.map(column => ({
        sourceField: column.name,
        targetField: column.name, // Mantém o mesmo nome por padrão
        sourceType: column.type,
        targetType: mapFieldType(column.type)
    }))
}

/**
 * Valida se um valor pode ser convertido para o tipo alvo
 */
export function validateFieldConversion(value: any, targetType: FramerFieldType): boolean {
    try {
        const converted = previewFieldValue(value, targetType)
        return converted !== null
    } catch {
        return false
    }
}

/**
 * Converte um objeto inteiro usando um conjunto de mapeamentos
 */
export function convertRecord(
    record: Record<string, any>, 
    mappings: FieldMapping[]
): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const mapping of mappings) {
        const value = record[mapping.sourceField]
        result[mapping.targetField] = previewFieldValue(value, mapping.targetType)
    }
    
    return result
} 