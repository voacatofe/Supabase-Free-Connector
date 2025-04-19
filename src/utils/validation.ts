import { FieldMapping, FieldType } from '../types';
import { ColumnInfo } from '../types/supabase';

interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Valida um valor para um tipo específico do Framer
 */
function validateValueForType(value: any, type: FieldType): boolean {
  if (value === null || value === undefined) {
    return true; // Valores nulos são permitidos por padrão
  }

  try {
    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
        
      case 'number':
        const num = Number(value);
        return !isNaN(num);
        
      case 'boolean':
        return typeof value === 'boolean' || ['true', 'false', '0', '1', 'yes', 'no', 'sim', 'não'].includes(String(value).toLowerCase());
        
      case 'date':
        const date = new Date(value);
        return !isNaN(date.getTime());
        
      case 'image':
        if (typeof value === 'string') {
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        }
        return typeof value === 'object' && value !== null && 'url' in value;
        
      case 'richtext':
      case 'formattedtext':
        return typeof value === 'string';
        
      case 'array':
        return Array.isArray(value) || (typeof value === 'string' && value.startsWith('[') && value.endsWith(']'));
        
      case 'json':
      case 'object':
        if (typeof value === 'object') return true;
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
        
      case 'collectionreference':
        return typeof value === 'string' || typeof value === 'number' || 
               (typeof value === 'object' && value !== null && ('id' in value || '_id' in value));
        
      case 'multicollectionreference':
        return Array.isArray(value) || typeof value === 'string' || typeof value === 'number';
        
      case 'color':
        if (typeof value !== 'string') return false;
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/;
        return colorRegex.test(value);
        
      case 'link':
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
        
      case 'file':
        if (typeof value === 'string') {
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        }
        return typeof value === 'object' && value !== null && 'url' in value;
        
      case 'enum':
        return typeof value === 'string' || typeof value === 'number';
        
      default:
        return true;
    }
  } catch {
    return false;
  }
}

/**
 * Valida a compatibilidade entre tipos do Supabase e Framer
 */
function validateTypeCompatibility(supabaseType: string, framerType: FieldType): boolean {
  const lowerSupaType = supabaseType.toLowerCase();
  const lowerFramerType = framerType.toLowerCase();

  // Mapeamento de compatibilidade
  const compatibilityMap: Record<string, FieldType[]> = {
    'text': ['string', 'formattedText', 'link', 'color', 'enum'],
    'varchar': ['string', 'formattedText', 'link', 'color', 'enum'],
    'char': ['string', 'enum'],
    'int': ['number', 'boolean', 'collectionReference'],
    'int2': ['number', 'boolean'],
    'int4': ['number', 'boolean'],
    'int8': ['number', 'boolean'],
    'float': ['number'],
    'float4': ['number'],
    'float8': ['number'],
    'decimal': ['number'],
    'numeric': ['number'],
    'boolean': ['boolean'],
    'date': ['date'],
    'timestamp': ['date'],
    'timestamptz': ['date'],
    'json': ['object', 'array'],
    'jsonb': ['object', 'array'],
    '_text': ['array', 'multiCollectionReference'],
    '_int4': ['array', 'multiCollectionReference'],
    '_int8': ['array', 'multiCollectionReference'],
    'uuid': ['string', 'collectionReference']
  };

  // Verifica se o tipo Supabase tem compatibilidades definidas
  if (compatibilityMap[lowerSupaType]) {
    return compatibilityMap[lowerSupaType].includes(lowerFramerType as FieldType);
  }

  // Para tipos não mapeados, permite string como fallback
  return lowerFramerType === 'string';
}

/**
 * Valida um conjunto completo de mapeamentos
 */
export function validateMappings(
  mappings: FieldMapping[], 
  columns: ColumnInfo[],
  sampleData?: any[]
): ValidationResult {
  const errors: ValidationError[] = [];
  let hasPrimaryKey = false;

  // Verifica se há mapeamentos
  if (!mappings || mappings.length === 0) {
    errors.push({
      field: 'mappings',
      message: 'Nenhum mapeamento definido',
      type: 'error'
    });
    return { isValid: false, errors };
  }

  // Verifica cada mapeamento
  mappings.forEach((mapping, index) => {
    const column = columns.find(col => col.name === mapping.sourceField);
    
    // Verifica se a coluna existe
    if (!column) {
      errors.push({
        field: mapping.sourceField,
        message: `Coluna '${mapping.sourceField}' não encontrada na tabela`,
        type: 'error'
      });
      return;
    }

    // Verifica se o campo Framer está definido
    if (!mapping.targetField) {
      errors.push({
        field: mapping.sourceField,
        message: 'Nome do campo no Framer não definido',
        type: 'error'
      });
    }

    // Verifica duplicatas de nomes de campo no Framer
    const duplicates = mappings.filter(m => m.targetField === mapping.targetField);
    if (duplicates.length > 1) {
      errors.push({
        field: mapping.targetField,
        message: `Nome de campo '${mapping.targetField}' duplicado no Framer`,
        type: 'error'
      });
    }

    // Verifica compatibilidade de tipos
    if (!validateTypeCompatibility(column.type, mapping.type as FieldType)) {
      errors.push({
        field: mapping.sourceField,
        message: `Tipo '${mapping.type}' pode não ser compatível com o tipo Supabase '${column.type}'`,
        type: 'warning'
      });
    }

    // Verifica chave primária
    if (mapping.isPrimaryKey) {
      hasPrimaryKey = true;
      
      // Verifica se a chave primária é um tipo adequado
      if (!['string', 'number', 'collectionReference'].includes(mapping.type.toLowerCase() as FieldType)) {
        errors.push({
          field: mapping.sourceField,
          message: 'Chave primária deve ser do tipo string, number ou collectionReference',
          type: 'error'
        });
      }
    }

    // Valida dados de exemplo se fornecidos
    if (sampleData && sampleData.length > 0) {
      sampleData.forEach((record, recordIndex) => {
        const value = record[mapping.sourceField];
        if (!validateValueForType(value, mapping.type as FieldType)) {
          errors.push({
            field: mapping.sourceField,
            message: `Valor incompatível encontrado no registro ${recordIndex + 1}`,
            type: 'warning'
          });
        }
      });
    }
  });

  // Verifica se há uma chave primária definida
  if (!hasPrimaryKey) {
    errors.push({
      field: 'primaryKey',
      message: 'Nenhuma chave primária definida',
      type: 'error'
    });
  }

  return {
    isValid: !errors.some(error => error.type === 'error'),
    errors
  };
}

/**
 * Valida um único mapeamento de campo
 */
export function validateMapping(
  mapping: FieldMapping,
  column: ColumnInfo,
  sampleValue?: any
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validações básicas
  if (!mapping.sourceField) {
    errors.push({
      field: 'sourceField',
      message: 'Campo fonte não definido',
      type: 'error'
    });
  }

  if (!mapping.targetField) {
    errors.push({
      field: 'targetField',
      message: 'Campo destino não definido',
      type: 'error'
    });
  }

  if (!mapping.type) {
    errors.push({
      field: 'type',
      message: 'Tipo não definido',
      type: 'error'
    });
  }

  // Validação de compatibilidade de tipos
  if (column && !validateTypeCompatibility(column.type, mapping.type as FieldType)) {
    errors.push({
      field: 'type',
      message: `Tipo '${mapping.type}' pode não ser compatível com o tipo Supabase '${column.type}'`,
      type: 'warning'
    });
  }

  // Validação de valor de exemplo
  if (sampleValue !== undefined && !validateValueForType(sampleValue, mapping.type as FieldType)) {
    errors.push({
      field: 'value',
      message: 'Valor de exemplo incompatível com o tipo definido',
      type: 'warning'
    });
  }

  return {
    isValid: !errors.some(error => error.type === 'error'),
    errors
  };
} 