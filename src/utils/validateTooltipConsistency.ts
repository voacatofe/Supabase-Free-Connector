/**
 * @file validateTooltipConsistency.ts
 * @description Valida a consistência entre os tooltips e as transformações
 * 
 * Este arquivo executa testes de validação para garantir que a lógica de transformação
 * de dados está alinhada com as descrições exibidas nos tooltips da interface.
 */

import { FieldType } from '../types';
import { TYPE_DESCRIPTIONS } from './transformUtils';
import { 
  validateTransformationConsistency,
  validateAllTransformations,
  generateValidationReport
} from './validateTransformations';

/**
 * Executa a validação de consistência entre tooltips e transformações
 * 
 * Esta função é a implementação da subtask 7.2, que verifica se o comportamento
 * da transformação corresponde às descrições fornecidas nos tooltips,
 * garantindo consistência entre o que é mostrado ao usuário e como os dados
 * são realmente transformados.
 * 
 * @returns Objeto com resultados da validação e relatório
 */
export function validateTransformationsAgainstTooltips() {
  console.log('Iniciando validação de consistência entre tooltips e transformações...');
  
  // Valida todas as transformações
  const { allValid, results } = validateAllTransformations();
  
  // Gera relatório completo
  const report = generateValidationReport();
  
  console.log(`Validação concluída. Resultado: ${allValid ? 'SUCESSO' : 'FALHAS ENCONTRADAS'}`);
  
  if (!allValid) {
    console.warn('Algumas transformações não estão consistentes com as descrições dos tooltips!');
    
    // Encontra os tipos com problemas
    const problemTypes = new Set<string>();
    results.filter(r => !r.valid).forEach(r => problemTypes.add(r.details.type));
    
    console.warn(`Tipos com problemas: ${Array.from(problemTypes).join(', ')}`);
  }
  
  return {
    allValid,
    results,
    report
  };
}

/**
 * Verifica se uma transformação específica é consistente com seu tooltip
 * 
 * @param type Tipo de campo
 * @param value Valor a ser verificado
 * @returns Resultado da validação
 */
export function checkSingleTransformation(type: FieldType, value: any) {
  console.log(`Verificando transformação para o tipo '${type}' com valor:`, value);
  
  // Obtém a descrição do tooltip
  const tooltipDescription = TYPE_DESCRIPTIONS[type as keyof typeof TYPE_DESCRIPTIONS] || 'Tipo desconhecido';
  console.log(`Descrição do tooltip: "${tooltipDescription}"`);
  
  // Valida a transformação
  const result = validateTransformationConsistency(type, value);
  
  console.log('Resultado da validação:');
  console.log(`- Válido: ${result.valid ? 'Sim' : 'Não'}`);
  console.log(`- Comportamento esperado: ${result.details.expectedBehavior}`);
  console.log(`- Comportamento real: ${result.details.actualBehavior}`);
  
  if (!result.valid) {
    console.warn('A transformação não está consistente com a descrição do tooltip!');
  }
  
  return result;
}

// Executar a validação se este arquivo for executado diretamente
if (require.main === module) {
  const { allValid, report } = validateTransformationsAgainstTooltips();
  
  // Exibir relatório completo no console
  console.log('\n' + report);
  
  // Sair com código apropriado
  process.exit(allValid ? 0 : 1);
} 