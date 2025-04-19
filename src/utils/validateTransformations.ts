/**
 * @file validateTransformations.ts
 * @description Valida as transformações contra as descrições dos tooltips
 * 
 * Este arquivo contém funções para garantir que as transformações de dados
 * estejam alinhadas com as descrições apresentadas nos tooltips da interface,
 * mantendo a consistência entre o que é mostrado ao usuário e o comportamento real.
 */

import { FieldType } from '../types';
import {
  TYPE_DESCRIPTIONS,
  DEFAULT_VALUES,
  transformValue,
  TransformResult
} from './transformUtils';

/**
 * Interface para resultado da validação de uma transformação
 */
export interface ValidationResult {
  valid: boolean;
  details: {
    type: FieldType;
    description: string;
    input: any;
    transformedValue: any;
    expectedBehavior: string;
    actualBehavior: string;
    isConsistent: boolean;
    error?: string;
  };
}

/**
 * Descreve comportamento real de uma transformação
 * 
 * @param value Valor original
 * @param result Resultado da transformação
 * @returns Descrição do comportamento
 */
function describeActualBehavior(value: any, result: TransformResult): string {
  if (!result.success) {
    return `Falha na transformação: ${result.error}. Valor padrão usado: ${JSON.stringify(result.value)}`;
  }
  
  if (value === null || value === undefined) {
    return `Valor nulo/indefinido transformado para: ${JSON.stringify(result.value)}`;
  }

  return `Valor '${JSON.stringify(value)}' transformado com sucesso para: ${JSON.stringify(result.value)}`;
}

/**
 * Descreve o comportamento esperado com base na descrição do tooltip
 * 
 * @param type Tipo de campo
 * @param value Valor a ser transformado
 * @returns Descrição do comportamento esperado
 */
function describeExpectedBehavior(type: FieldType, value: any): string {
  const typeDescription = TYPE_DESCRIPTIONS[type as keyof typeof TYPE_DESCRIPTIONS] || 'Tipo desconhecido';
  
  if (value === null || value === undefined) {
    return `Valor nulo/indefinido deve ser transformado para um valor padrão apropriado para ${type} (${typeDescription})`;
  }

  return `Valor deve ser transformado conforme a descrição: ${typeDescription}`;
}

/**
 * Verifica se o comportamento real da transformação é consistente
 * com o que seria esperado com base na descrição do tooltip
 * 
 * @param type Tipo de campo
 * @param value Valor original
 * @param result Resultado da transformação
 * @returns Verdadeiro se o comportamento for consistente
 */
function isConsistentWithDescription(type: FieldType, value: any, result: TransformResult): boolean {
  // Se a transformação falhou, verificar se o valor padrão foi aplicado corretamente
  if (!result.success) {
    return JSON.stringify(result.value) === JSON.stringify(DEFAULT_VALUES[type]);
  }

  // Verificações específicas por tipo
  switch (type) {
    case 'string':
      return typeof result.value === 'string';
    
    case 'number':
      return typeof result.value === 'number' && !isNaN(result.value);
    
    case 'boolean':
      return typeof result.value === 'boolean';
    
    case 'date':
      // Para datas, verificamos se é uma string ISO válida
      return typeof result.value === 'string' && !isNaN(Date.parse(result.value));
    
    case 'color':
      // Para cores, verificamos se é um formato hexadecimal ou RGB válido
      if (typeof result.value !== 'string') return false;
      return /^#([0-9A-F]{3}){1,2}$/i.test(result.value) || 
             /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(result.value);
    
    case 'formattedText':
      return typeof result.value === 'string';
    
    case 'image':
    case 'file':
    case 'link':
      // URLs devem ser strings ou null
      return result.value === null || typeof result.value === 'string';
    
    case 'enum':
      return typeof result.value === 'string';
    
    case 'collectionReference':
      return result.value === null || typeof result.value === 'string';
    
    case 'multiCollectionReference':
      return Array.isArray(result.value);
    
    case 'object':
      return result.value === null || typeof result.value === 'object';
    
    case 'array':
      return Array.isArray(result.value);
    
    default:
      return false;
  }
}

/**
 * Valida se uma transformação de valor está consistente com a descrição
 * apresentada no tooltip para o tipo de campo
 * 
 * @param type Tipo de campo Framer
 * @param value Valor a ser validado
 * @returns Resultado da validação
 */
export function validateTransformationConsistency(type: FieldType, value: any): ValidationResult {
  // Obtém a descrição do tipo a partir dos tooltips
  const description = TYPE_DESCRIPTIONS[type as keyof typeof TYPE_DESCRIPTIONS] || 'Tipo desconhecido';
  
  // Executa a transformação
  const result = transformValue(value, type);
  
  // Determina o comportamento esperado com base na descrição
  const expectedBehavior = describeExpectedBehavior(type, value);
  
  // Determina o comportamento real da transformação
  const actualBehavior = describeActualBehavior(value, result);
  
  // Verifica se o comportamento é consistente com a descrição
  const isConsistent = isConsistentWithDescription(type, value, result);
  
  return {
    valid: isConsistent,
    details: {
      type,
      description,
      input: value,
      transformedValue: result.value,
      expectedBehavior,
      actualBehavior,
      isConsistent,
      error: result.error
    }
  };
}

/**
 * Verifica consistência para uma lista de valores de amostra para cada tipo
 * 
 * @returns Relatório completo de validação
 */
export function validateAllTransformations(): {
  allValid: boolean;
  results: ValidationResult[];
} {
  const results: ValidationResult[] = [];
  
  // Valores de amostra para testar cada tipo
  const testCases: [FieldType, any[]][] = [
    ['string', ['Hello', 123, true, null, undefined, new Date()]],
    ['number', ['123', '123.45', 123, 123.45, 'abc', true, false, null, undefined]],
    ['boolean', ['true', 'false', true, false, 0, 1, 'sim', 'não', null, undefined]],
    ['date', ['2023-01-01', '2023-01-01T12:00:00Z', new Date(), 1672531200000, 'invalid', null, undefined]],
    ['color', ['#fff', '#ff0000', 'rgb(255, 0, 0)', 'vermelho', 'red', 'invalid', null, undefined]],
    ['formattedText', ['<b>Bold text</b>', 'Plain text', 123, null, undefined]],
    ['image', ['https://example.com/image.jpg', '/image.jpg', 123, null, undefined]],
    ['file', ['https://example.com/file.pdf', '/file.pdf', 123, null, undefined]],
    ['link', ['https://example.com', 'example.com', 123, null, undefined]],
    ['enum', ['option1', 123, null, undefined]],
    ['collectionReference', ['ref123', 123, null, undefined]],
    ['multiCollectionReference', [['ref1', 'ref2'], 'ref1', 123, null, undefined]],
    ['object', [{key: 'value'}, '{"key":"value"}', 123, null, undefined]],
    ['array', [[1, 2, 3], '[1, 2, 3]', 123, null, undefined]]
  ];
  
  // Valida cada tipo com seus valores de teste
  for (const [type, values] of testCases) {
    for (const value of values) {
      const result = validateTransformationConsistency(type, value);
      results.push(result);
    }
  }
  
  // Verifica se todos os testes passaram
  const allValid = results.every(result => result.valid);
  
  return {
    allValid,
    results
  };
}

/**
 * Gera um relatório de validação resumido
 * 
 * @returns Relatório resumido em formato de string
 */
export function generateValidationReport(): string {
  const { allValid, results } = validateAllTransformations();
  
  let report = `# Relatório de Validação de Transformações\n\n`;
  report += `Status geral: ${allValid ? '✅ Todos os testes passaram' : '❌ Alguns testes falharam'}\n\n`;
  
  // Agrupa resultados por tipo
  const groupedByType: Record<string, ValidationResult[]> = {};
  
  for (const result of results) {
    const type = result.details.type;
    
    if (!groupedByType[type]) {
      groupedByType[type] = [];
    }
    
    groupedByType[type].push(result);
  }
  
  // Gera relatório para cada tipo
  for (const type in groupedByType) {
    const typeResults = groupedByType[type];
    const typeValid = typeResults.every(r => r.valid);
    
    report += `## Tipo: ${type} ${typeValid ? '✅' : '❌'}\n\n`;
    report += `Descrição: ${TYPE_DESCRIPTIONS[type as keyof typeof TYPE_DESCRIPTIONS] || 'Desconhecida'}\n\n`;
    
    const failedResults = typeResults.filter(r => !r.valid);
    
    if (failedResults.length > 0) {
      report += `### Problemas encontrados:\n\n`;
      
      for (const failed of failedResults) {
        report += `- Entrada: \`${JSON.stringify(failed.details.input)}\`\n`;
        report += `  - Esperado: ${failed.details.expectedBehavior}\n`;
        report += `  - Recebido: ${failed.details.actualBehavior}\n\n`;
      }
    } else {
      report += `Todos os testes de transformação passaram para este tipo.\n\n`;
    }
  }
  
  return report;
} 