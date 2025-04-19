/**
 * @file basicTypeConverters.ts
 * @description Implementação de funções básicas para converter tipos de dados entre Supabase e Framer CMS
 * 
 * Este arquivo contém as funções centrais de conversão para tipos básicos (string, number, boolean),
 * definindo interfaces claras para entrada e saída, e garantindo tratamento de erros adequado.
 */

import { FieldType } from '../types';

/**
 * Interface para o resultado da conversão
 */
export interface ConversionResult<T> {
  success: boolean;
  value: T;
  error?: string;
}

/**
 * Valores padrão para quando a conversão falha ou recebe valores nulos/indefinidos
 */
export const DEFAULT_VALUES: Record<FieldType, any> = {
  'string': '',
  'number': 0,
  'boolean': false,
  'date': null,
  'color': '#000000',
  'formattedText': '',
  'image': null,
  'file': null,
  'link': '',
  'enum': '',
  'collectionReference': null,
  'multiCollectionReference': [],
  'object': {},
  'array': []
};

/**
 * Converte qualquer valor para string
 * 
 * @param value - Valor a ser convertido
 * @returns Resultado da conversão para string
 */
export function convertToString(value: any): ConversionResult<string> {
  // Tratamento para valores nulos ou indefinidos
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.string };
  }

  try {
    // Para a maioria dos tipos, String() funciona bem
    return { success: true, value: String(value) };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.string,
      error: `Falha ao converter para string: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Converte qualquer valor para número
 * 
 * @param value - Valor a ser convertido 
 * @returns Resultado da conversão para número
 */
export function convertToNumber(value: any): ConversionResult<number> {
  // Tratamento para valores nulos ou indefinidos
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.number };
  }

  try {
    // Tenta converter para número
    const num = Number(value);
    
    // Verifica se é um número válido (não NaN)
    if (isNaN(num)) {
      return {
        success: false,
        value: DEFAULT_VALUES.number,
        error: `O valor "${String(value)}" não pode ser convertido para número`
      };
    }
    
    return { success: true, value: num };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.number,
      error: `Falha ao converter para número: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Converte qualquer valor para boolean
 * 
 * @param value - Valor a ser convertido
 * @returns Resultado da conversão para boolean
 */
export function convertToBoolean(value: any): ConversionResult<boolean> {
  // Tratamento para valores nulos ou indefinidos
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.boolean };
  }

  try {
    // Implementação mais robusta para strings
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      // Lista de valores que são considerados true
      if (['true', '1', 'yes', 'sim', 'verdadeiro', 'y', 's'].includes(lowerValue)) {
        return { success: true, value: true };
      }
      // Lista de valores que são considerados false
      if (['false', '0', 'no', 'não', 'nao', 'falso', 'n'].includes(lowerValue)) {
        return { success: true, value: false };
      }
    }
    
    // Para outros tipos, usa a conversão padrão do JavaScript
    return { success: true, value: Boolean(value) };
  } catch (error) {
    return {
      success: false, 
      value: DEFAULT_VALUES.boolean,
      error: `Falha ao converter para boolean: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Função principal que direciona a conversão para o tipo específico
 * 
 * @param value - Valor a ser convertido
 * @param targetType - Tipo de destino no Framer
 * @returns Resultado da conversão para o tipo especificado
 */
export function convertBasicType(value: any, targetType: FieldType): ConversionResult<any> {
  switch (targetType) {
    case 'string':
      return convertToString(value);
    case 'number':
      return convertToNumber(value);
    case 'boolean':
      return convertToBoolean(value);
    default:
      // Para outros tipos, retorna o valor original
      // Tipos complexos serão tratados em outros módulos
      return {
        success: false,
        value: value ?? DEFAULT_VALUES[targetType] ?? null,
        error: `O tipo "${targetType}" não é um tipo básico, use o conversor apropriado`
      };
  }
}

/**
 * Verifica se um valor pode ser convertido para um tipo específico
 * 
 * @param value - Valor a ser verificado
 * @param targetType - Tipo de destino no Framer
 * @returns Se o valor pode ser convertido para o tipo especificado
 */
export function canConvertToType(value: any, targetType: FieldType): boolean {
  const result = convertBasicType(value, targetType);
  return result.success;
}

/**
 * Obtém o valor padrão para um tipo específico
 * 
 * @param type - Tipo de campo no Framer
 * @returns Valor padrão para o tipo especificado
 */
export function getDefaultValueForType(type: FieldType): any {
  return DEFAULT_VALUES[type] ?? null;
} 