/**
 * @file basicTransformations.ts
 * @description Funções de conversão de tipos básicos para o plugin Supabase-Framer
 */

/**
 * Funções de transformação para tipos básicos
 * Converte dados do Supabase para formatos compatíveis com Framer CMS
 */

// Interfaces para resultados de transformação
export interface TransformationSuccess<T> {
  success: true;
  value: T;
}

export interface TransformationError {
  success: false;
  error: string;
}

export type TransformationResult<T> = TransformationSuccess<T> | TransformationError;

// Tipos básicos suportados
export type BasicType = 'string' | 'number' | 'boolean' | 'date';

/**
 * Transforma um valor para string
 */
export function transformToString(value: any): TransformationResult<string> {
  try {
    if (value === null || value === undefined) {
      return { success: false, error: 'Valor nulo ou indefinido' };
    }
    
    // Para datas, formatar como ISO string
    if (value instanceof Date) {
      return { success: true, value: value.toISOString() };
    }
    
    // Para objetos, converter para JSON
    if (typeof value === 'object') {
      return { success: true, value: JSON.stringify(value) };
    }
    
    // Para outros tipos, usar conversão direta
    return { success: true, value: String(value) };
  } catch (error) {
    return { 
      success: false, 
      error: `Erro ao converter para string: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Transforma um valor para número
 */
export function transformToNumber(value: any): TransformationResult<number> {
  try {
    if (value === null || value === undefined) {
      return { success: false, error: 'Valor nulo ou indefinido' };
    }
    
    // Se já for um número, retornar diretamente
    if (typeof value === 'number') {
      if (isNaN(value)) {
        return { success: false, error: 'Valor é NaN' };
      }
      return { success: true, value };
    }
    
    // Para strings, converter para float
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Verificar se é uma string vazia
      if (trimmed === '') {
        return { success: false, error: 'String vazia não pode ser convertida para número' };
      }
      
      const num = Number(trimmed);
      if (isNaN(num)) {
        return { success: false, error: `String "${value}" não é um número válido` };
      }
      return { success: true, value: num };
    }
    
    // Para boolean, converter para 0/1
    if (typeof value === 'boolean') {
      return { success: true, value: value ? 1 : 0 };
    }
    
    // Para datas, usar timestamp
    if (value instanceof Date) {
      return { success: true, value: value.getTime() };
    }
    
    return { success: false, error: `Tipo ${typeof value} não pode ser convertido para número` };
  } catch (error) {
    return { 
      success: false, 
      error: `Erro ao converter para número: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Transforma um valor para boolean
 */
export function transformToBoolean(value: any): TransformationResult<boolean> {
  try {
    if (value === null || value === undefined) {
      return { success: false, error: 'Valor nulo ou indefinido' };
    }
    
    // Se já for um boolean, retornar diretamente
    if (typeof value === 'boolean') {
      return { success: true, value };
    }
    
    // Para strings, verificar valores comuns
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      
      if (['true', 'yes', 'y', '1', 'sim', 's'].includes(lowerValue)) {
        return { success: true, value: true };
      }
      
      if (['false', 'no', 'n', '0', 'não', 'nao'].includes(lowerValue)) {
        return { success: true, value: false };
      }
      
      return { success: false, error: `String "${value}" não pode ser convertida para boolean` };
    }
    
    // Para números, 0 é false, qualquer outro valor é true
    if (typeof value === 'number') {
      return { success: true, value: value !== 0 };
    }
    
    return { success: false, error: `Tipo ${typeof value} não pode ser convertido para boolean` };
  } catch (error) {
    return { 
      success: false, 
      error: `Erro ao converter para boolean: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Transforma um valor para Date
 */
export function transformToDate(value: any): TransformationResult<Date> {
  try {
    if (value === null || value === undefined) {
      return { success: false, error: 'Valor nulo ou indefinido' };
    }
    
    // Se já for uma data, retornar diretamente
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return { success: false, error: 'Data inválida' };
      }
      return { success: true, value };
    }
    
    // Para strings, tentar converter para data
    if (typeof value === 'string') {
      // Verificar se a string está vazia
      if (value.trim() === '') {
        return { success: false, error: 'String vazia não pode ser convertida para data' };
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { success: false, error: `String "${value}" não é uma data válida` };
      }
      return { success: true, value: date };
    }
    
    // Para números, assumir timestamp em milissegundos
    if (typeof value === 'number') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { success: false, error: 'Timestamp numérico inválido' };
      }
      return { success: true, value: date };
    }
    
    return { success: false, error: `Tipo ${typeof value} não pode ser convertido para data` };
  } catch (error) {
    return { 
      success: false, 
      error: `Erro ao converter para data: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Transforma um valor para um tipo básico específico
 */
export function transformBasicValue<T>(value: any, targetType: BasicType): TransformationResult<any> {
  switch (targetType) {
    case 'string':
      return transformToString(value);
    case 'number':
      return transformToNumber(value);
    case 'boolean':
      return transformToBoolean(value);
    case 'date':
      return transformToDate(value);
    default:
      return { 
        success: false, 
        error: `Tipo alvo '${targetType}' não é suportado` 
      };
  }
}

/**
 * Valida se uma transformação entre tipos é possível
 */
export function validateBasicTransformation(
  sourceValue: any,
  targetType: BasicType
): { valid: boolean; reason?: string } {
  // Validar transformação para string (quase sempre possível)
  if (targetType === 'string') {
    if (sourceValue === null || sourceValue === undefined) {
      return { valid: false, reason: 'Valor nulo ou indefinido' };
    }
    return { valid: true };
  }
  
  // Validar transformação para número
  if (targetType === 'number') {
    if (sourceValue === null || sourceValue === undefined) {
      return { valid: false, reason: 'Valor nulo ou indefinido' };
    }
    
    if (typeof sourceValue === 'number') {
      return isNaN(sourceValue)
        ? { valid: false, reason: 'Valor é NaN' }
        : { valid: true };
    }
    
    if (typeof sourceValue === 'string') {
      const trimmed = sourceValue.trim();
      if (trimmed === '') {
        return { valid: false, reason: 'String vazia' };
      }
      return isNaN(Number(trimmed))
        ? { valid: false, reason: `String "${sourceValue}" não é um número válido` }
        : { valid: true };
    }
    
    if (typeof sourceValue === 'boolean' || sourceValue instanceof Date) {
      return { valid: true };
    }
    
    return { valid: false, reason: `Tipo ${typeof sourceValue} não pode ser convertido para número` };
  }
  
  // Validar transformação para boolean
  if (targetType === 'boolean') {
    if (sourceValue === null || sourceValue === undefined) {
      return { valid: false, reason: 'Valor nulo ou indefinido' };
    }
    
    if (typeof sourceValue === 'boolean' || typeof sourceValue === 'number') {
      return { valid: true };
    }
    
    if (typeof sourceValue === 'string') {
      const lowerValue = sourceValue.toLowerCase().trim();
      return ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0', 'sim', 'não', 'nao', 's'].includes(lowerValue)
        ? { valid: true }
        : { valid: false, reason: `String "${sourceValue}" não tem formato boolean reconhecível` };
    }
    
    return { valid: false, reason: `Tipo ${typeof sourceValue} não pode ser convertido para boolean` };
  }
  
  // Validar transformação para data
  if (targetType === 'date') {
    if (sourceValue === null || sourceValue === undefined) {
      return { valid: false, reason: 'Valor nulo ou indefinido' };
    }
    
    if (sourceValue instanceof Date) {
      return isNaN(sourceValue.getTime())
        ? { valid: false, reason: 'Data inválida' }
        : { valid: true };
    }
    
    if (typeof sourceValue === 'string') {
      const trimmed = sourceValue.trim();
      if (trimmed === '') {
        return { valid: false, reason: 'String vazia' };
      }
      
      const date = new Date(trimmed);
      return isNaN(date.getTime())
        ? { valid: false, reason: `String "${sourceValue}" não é uma data válida` }
        : { valid: true };
    }
    
    if (typeof sourceValue === 'number') {
      const date = new Date(sourceValue);
      return isNaN(date.getTime())
        ? { valid: false, reason: 'Timestamp numérico inválido' }
        : { valid: true };
    }
    
    return { valid: false, reason: `Tipo ${typeof sourceValue} não pode ser convertido para data` };
  }
  
  return { valid: false, reason: `Tipo alvo '${targetType}' não é suportado` };
} 